import { describe, it, expect } from 'vitest';
import { cleanMarkdown } from './markdown';

const sampleMarkdown = `
# Title

<!-- This is a comment -->

This is a paragraph with [a link](https://example.com) and some **bold** text.

![Image](image.png)

## Subtitle

* List item 1
* List item 2

\`\`\`javascript
console.log('code block');
\`\`\`

Here is \`inline code\`.

<div>HTML content</div>

&copy; 2023
`;

// Create a VERY large markdown string for benchmarking (4MB)
const complexMarkdown = sampleMarkdown.repeat(20000);

describe('cleanMarkdown', () => {
    it('cleans markdown correctly', () => {
        const result = cleanMarkdown(sampleMarkdown);
        expect(result).not.toContain('# Title');
        expect(result).not.toContain('<!--');
        expect(result).toContain('a link');
        expect(result).not.toContain('https://example.com');
        expect(result).not.toContain('![Image]');
        expect(result).not.toContain('console.log');
        expect(result).toContain('This is a paragraph');
        expect(result).toContain('List item 1');
        expect(result).toContain('List item 2');
        expect(result).not.toContain('inline code');
        expect(result).not.toContain('<div>');
        expect(result).not.toContain('&copy;');
    });

    it('benchmarks cleanMarkdown', () => {
        const iterations = 20; // Fewer iterations for large string
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
            cleanMarkdown(complexMarkdown);
        }
        const end = performance.now();
        const duration = end - start;
        console.log(`cleanMarkdown took ${duration.toFixed(2)}ms for ${iterations} iterations (Avg: ${(duration/iterations).toFixed(2)}ms)`);
    });
});
