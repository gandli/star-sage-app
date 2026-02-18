import { describe, bench } from 'vitest';

describe('RepoList missingIds calculation', () => {
    // Simulate a large list of repos
    const repos = Array.from({ length: 5000 }).map((_, i) => ({
        id: i,
        // Mix of translated and untranslated
        description_cn: i % 3 === 0 ? 'Some translation' : null,
        description: 'Some description ' + i + (i % 5 === 0 ? ' 中文' : ''),
        // ... other fields not needed for this logic
    }));

    bench('filter and map (original)', () => {
        repos
            .filter(r =>
                !r.description_cn &&
                r.description &&
                !/[\u4e00-\u9fa5]/.test(r.description)
            )
            .map(r => r.id);
    });

    bench('single pass loop (optimized)', () => {
        const ids: number[] = [];
        const regex = /[\u4e00-\u9fa5]/;
        for (const r of repos) {
             if (!r.description_cn &&
                 r.description &&
                 !regex.test(r.description)) {
                 ids.push(r.id);
             }
        }
    });
});
