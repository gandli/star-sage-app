import { supabase } from '../lib/supabase';

export interface TranslationResponse {
    source_lang?: string;
    target_lang?: string;
    translations: string[];
    input_texts?: string[];
}

// Memory cache for in-flight translation requests to prevent duplicates
const translationRequests = new Map<string, Promise<string[]>>();

/**
 * Checks if a string contains Chinese characters.
 */
export const containsChinese = (text: string): boolean => {
    return /[\u4e00-\u9fa5]/.test(text);
};

// Helper for SHA-256 hashing
async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Batch translate multiple texts in a single API call.
 */
export const translateBatch = async (
    texts: string[],
    target: string = 'zh',
    retries: number = 2
): Promise<string[]> => {
    if (texts.length === 0) return [];

    // Filter out texts that already contain Chinese (if target is Chinese)
    const needsTranslation: { index: number; text: string; hash?: string }[] = [];
    const results: string[] = new Array(texts.length);

    // 1. Initial Pass: Identify what truly needs translation
    for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        if (target === 'zh' && containsChinese(text)) {
            results[i] = text;
        } else {
            needsTranslation.push({ index: i, text });
        }
    }

    // If nothing needs translation, return early
    if (needsTranslation.length === 0) {
        return results;
    }

    // 2. Check Supabase Cache for items needing translation
    const itemsToFetch: typeof needsTranslation = [];

    try {
        // Compute hashes
        await Promise.all(needsTranslation.map(async (item) => {
            item.hash = await sha256(item.text);
        }));

        const hashes = needsTranslation.map(item => item.hash!);

        const { data: cachedData } = await supabase
            .from('translations')
            .select('translated_text, text_hash')
            .in('text_hash', hashes)
            .eq('target_lang', target);

        const cacheMap = new Map<string, string>();
        if (cachedData) {
            cachedData.forEach(row => {
                if (row.text_hash) cacheMap.set(row.text_hash, row.translated_text);
            });
        }

        // Assign cached values & identify missing
        for (const item of needsTranslation) {
            if (item.hash && cacheMap.has(item.hash)) {
                results[item.index] = cacheMap.get(item.hash)!;
            } else {
                itemsToFetch.push(item);
            }
        }
    } catch (e) {
        console.warn('[translateBatch] Cache lookup failed, falling back to full fetch', e);
        // Fallback: everyone needs fetch
        itemsToFetch.length = 0;
        itemsToFetch.push(...needsTranslation);
    }

    // If everything was cached, return!
    if (itemsToFetch.length === 0) {
        return results;
    }

    // 3. Perform batch translation for missing items
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
        try {
            const apiUrl = import.meta.env.VITE_TRANSLATION_API_URL;
            if (!apiUrl) {
                console.error('Translation API URL is missing');
                // Return originals for failures
                itemsToFetch.forEach(item => results[item.index] = item.text);
                return results;
            }

            const payload = {
                texts: itemsToFetch.map(item => item.text),
                source_lang: 'en',
                target_lang: target
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                if (response.status >= 500 && i < retries) {
                    const delay = Math.pow(2, i) * 1000;
                    console.warn(`[translateBatch] Batch translation attempt ${i + 1} failed (500), retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw new Error(`Batch translation request failed (${response.status}): ${errorBody}`);
            }

            const data: TranslationResponse = await response.json();

            // Map translations back to results
            if (Array.isArray(data.translations) && data.translations.length === itemsToFetch.length) {
                const newCacheItems: any[] = [];
                itemsToFetch.forEach((item, translationIndex) => {
                    const translated = data.translations[translationIndex];
                    results[item.index] = translated;

                    if (item.hash) {
                        newCacheItems.push({
                            input_text: item.text,
                            translated_text: translated,
                            target_lang: target,
                            text_hash: item.hash
                        });
                    }
                });

                // 4. Store new translations in Supabase (Fire & Forget)
                if (newCacheItems.length > 0) {
                    supabase.from('translations').upsert(newCacheItems, { onConflict: 'text_hash, target_lang' })
                        .then(({ error }) => {
                            if (error) console.warn('[translateBatch] Cache background save failed:', error);
                        });
                }

                return results;
            } else {
                throw new Error('Translation response length mismatch');
            }
        } catch (error) {
            lastError = error;
            if (i < retries) {
                const delay = Math.pow(2, i) * 1000;
                console.warn(`[translateBatch] Batch translation attempt ${i + 1} failed, retrying in ${delay}ms...`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
        }
    }

    console.error('Batch translation error after retries:', lastError);
    throw lastError;
};

// Batcher implementation
type BatchRequest = {
    text: string;
    resolve: (value: string[]) => void;
    reject: (reason?: any) => void;
};

class TranslationBatcher {
    private queues = new Map<string, BatchRequest[]>();
    private timers = new Map<string, ReturnType<typeof setTimeout>>();

    enqueue(text: string, target: string, retries: number): Promise<string[]> {
        const key = `${target}:${retries}`;

        return new Promise<string[]>((resolve, reject) => {
            if (!this.queues.has(key)) {
                this.queues.set(key, []);
            }

            this.queues.get(key)!.push({ text, resolve, reject });

            if (!this.timers.has(key)) {
                const timer = setTimeout(() => {
                    this.flush(key, target, retries);
                }, 50); // 50ms buffer window
                this.timers.set(key, timer);
            }
        });
    }

    private async flush(key: string, target: string, retries: number) {
        this.timers.delete(key);
        const queue = this.queues.get(key);
        this.queues.delete(key);

        if (!queue || queue.length === 0) return;

        const texts = queue.map(item => item.text);

        try {
            const results = await translateBatch(texts, target, retries);
            // results matches texts index-wise
            queue.forEach((item, index) => {
                // Ensure we return arrays as expected by translateText
                item.resolve([results[index]]);
            });
        } catch (error) {
            queue.forEach(item => item.reject(error));
        }
    }
}

const batcher = new TranslationBatcher();

export const translateText = async (text: string | string[], target: string = 'zh', retries: number = 2): Promise<string[]> => {
    // Skip if already Chinese and target is Chinese
    if (typeof text === 'string' && target === 'zh' && containsChinese(text)) {
        return [text];
    }

    // For single string, use batcher (which uses translateBatch)
    if (typeof text === 'string') {
        const cacheKey = `${target}:${text}`;

        // 1. Check Memory Cache (In-flight)
        if (translationRequests.has(cacheKey)) {
            return translationRequests.get(cacheKey)!;
        }

        // Delegate to batcher
        const promise = batcher.enqueue(text, target, retries);

        translationRequests.set(cacheKey, promise);
        try {
            return await promise;
        } finally {
            translationRequests.delete(cacheKey);
        }
    }

    // For arrays, just perform (legacy/direct path)
    return performTranslation_(text, target, retries);
};

const performTranslation_ = async (text: string | string[], target: string, retries: number): Promise<string[]> => {
    let lastError: any;

    for (let i = 0; i <= retries; i++) {
        try {
            const apiUrl = import.meta.env.VITE_TRANSLATION_API_URL;
            if (!apiUrl) {
                console.error('Translation API URL is missing');
                return [];
            }

            const payload = {
                [Array.isArray(text) ? 'texts' : 'text']: text,
                source_lang: 'en',
                target_lang: target
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                // 500 error might be temporary, but 429 or others might not
                if (response.status >= 500 && i < retries) {
                    const delay = Math.pow(2, i) * 1000;
                    console.warn(`[translate] Translation attempt ${i + 1} failed (500), retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw new Error(`Translation request failed (${response.status}): ${errorBody}`);
            }

            const data: TranslationResponse = await response.json();
            return Array.isArray(data.translations) ? data.translations : [];
        } catch (error) {
            lastError = error;
            if (i < retries) {
                const delay = Math.pow(2, i) * 1000;
                console.warn(`[translate] Translation attempt ${i + 1} failed, retrying in ${delay}ms...`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
        }
    }

    console.error('Translation error after retries:', lastError);
    throw lastError;
};
