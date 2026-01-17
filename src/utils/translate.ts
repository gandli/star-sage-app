export interface TranslationResponse {
    source_lang?: string;
    target_lang?: string;
    translations: string[];
    input_texts?: string[];
}

export const translateText = async (text: string | string[], target: string = 'zh'): Promise<string[]> => {
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
            throw new Error(`Translation request failed (${response.status}): ${errorBody}`);
        }

        const data: TranslationResponse = await response.json();

        if (Array.isArray(data.translations)) {
            return data.translations;
        }

        return [];
    } catch (error) {
        console.error('Translation error:', error);
        throw error;
    }
};
