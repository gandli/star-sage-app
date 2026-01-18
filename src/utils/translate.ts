export interface TranslationResponse {
    source_lang?: string;
    target_lang?: string;
    translations: string[];
    input_texts?: string[];
}

// Memory cache for in-flight translation requests to prevent duplicates
const translationRequests = new Map<string, Promise<string[]>>();

export const translateText = async (text: string | string[], target: string = 'zh', retries: number = 2): Promise<string[]> => {
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
