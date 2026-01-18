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

export const translateText = async (text: string | string[], target: string = 'zh', retries: number = 2): Promise<string[]> => {
    // Skip if already Chinese and target is Chinese
    if (typeof text === 'string' && target === 'zh' && containsChinese(text)) {
        return [text];
    }

    // For single string, use coalescing
    if (typeof text === 'string') {
        const cacheKey = `${target}:${text}`;
        if (translationRequests.has(cacheKey)) {
            return translationRequests.get(cacheKey)!;
        }

        const promise = (async () => {
            return performTranslation_(text, target, retries);
        })();

        translationRequests.set(cacheKey, promise);
        try {
            return await promise;
        } finally {
            translationRequests.delete(cacheKey);
        }
    }

    // For arrays, just perform (or could be split, but AutoTranslator uses strings)
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
                if (response.status === 500 && i < retries) {
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

/**
 * Batch translate multiple texts in a single API call.
 * @param texts Array of texts to translate
 * @param target Target language (default: 'zh')
 * @param retries Number of retry attempts (default: 2)
 * @returns Array of translated texts, maintaining index correspondence
 */
export const translateBatch = async (
    texts: string[],
    target: string = 'zh',
    retries: number = 2
): Promise<string[]> => {
    if (texts.length === 0) return [];

    // Filter out texts that already contain Chinese (if target is Chinese)
    const needsTranslation: { index: number; text: string }[] = [];
    const results: string[] = new Array(texts.length);

    texts.forEach((text, index) => {
        if (target === 'zh' && containsChinese(text)) {
            results[index] = text; // Keep original
        } else {
            needsTranslation.push({ index, text });
        }
    });

    // If nothing needs translation, return early
    if (needsTranslation.length === 0) {
        return results;
    }

    // Perform batch translation
    let lastError: any;
    for (let i = 0; i <= retries; i++) {
        try {
            const apiUrl = import.meta.env.VITE_TRANSLATION_API_URL;
            if (!apiUrl) {
                console.error('Translation API URL is missing');
                return results.map((r, idx) => r || texts[idx]); // Return originals
            }

            const payload = {
                texts: needsTranslation.map(item => item.text),
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
                if (response.status === 500 && i < retries) {
                    const delay = Math.pow(2, i) * 1000;
                    console.warn(`[translateBatch] Batch translation attempt ${i + 1} failed (500), retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw new Error(`Batch translation request failed (${response.status}): ${errorBody}`);
            }

            const data: TranslationResponse = await response.json();

            // Map translations back to original indices
            if (Array.isArray(data.translations) && data.translations.length === needsTranslation.length) {
                needsTranslation.forEach((item, translationIndex) => {
                    results[item.index] = data.translations[translationIndex];
                });
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
