import { useState, useEffect } from 'react';
import { autoTranslator } from '../services/AutoTranslator';

export function useTranslationStatus() {
    const [isTranslating, setIsTranslating] = useState(false);

    useEffect(() => {
        // Subscribe returns a cleanup function
        const unsubscribe = autoTranslator.subscribe((status) => {
            setIsTranslating(status);
        });
        return () => { unsubscribe(); };
    }, []);

    return isTranslating;
}
