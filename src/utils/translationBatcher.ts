import { translateBatch } from './translate';
import { db } from './db';

class TranslationBatcher {
    private queue: { id: number; text: string; resolve: (val: string) => void; reject: (err: any) => void }[] = [];
    private timeout: any = null;
    private batchDelay: number = 200;

    constructor(delay: number = 200) {
        this.batchDelay = delay;
    }

    enqueue(id: number, text: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.queue.push({ id, text, resolve, reject });

            if (!this.timeout) {
                this.timeout = setTimeout(() => this.flush(), this.batchDelay);
            }
        });
    }

    private async flush() {
        const batch = [...this.queue];
        this.queue = [];
        this.timeout = null;

        if (batch.length === 0) return;

        // Deduplicate requests by repo ID
        const uniqueBatch = batch.filter((item, index, self) =>
            index === self.findIndex((t) => (
                t.id === item.id
            ))
        );

        const texts = uniqueBatch.map(item => item.text);

        try {
            const results = await translateBatch(texts);

            const successfulTranslations: { repoId: number; translation: string }[] = [];

            // Map results back to all queued items
            batch.forEach((item) => {
                 const batchIndex = uniqueBatch.findIndex(u => u.id === item.id);
                 if (batchIndex !== -1) {
                     const result = results[batchIndex];
                     if (result) {
                         item.resolve(result);

                         // Collect for DB save (deduplicated)
                         if (!successfulTranslations.some(s => s.repoId === item.id)) {
                             successfulTranslations.push({ repoId: item.id, translation: result });
                         }
                     } else {
                         item.reject(new Error("Translation returned empty"));
                     }
                 } else {
                     item.reject(new Error("Request lost in batch processing"));
                 }
            });

            // Save to DB in batch
            if (successfulTranslations.length > 0) {
                 try {
                     await db.saveBatchTranslations(successfulTranslations);
                 } catch (dbError) {
                     console.error("Failed to save translations to DB:", dbError);
                 }
            }

        } catch (error) {
            batch.forEach(item => item.reject(error));
        }
    }
}

export const translationBatcher = new TranslationBatcher();
