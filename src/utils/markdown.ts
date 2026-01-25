export function cleanMarkdown(markdown: string) {
    const lines = markdown
        .replace(/<!--[\s\S]*?-->|`{3}[\s\S]*?`{3}|!\[[^\]]*\]\([^)]*\)|^#+.*$|^\s*[-*+]\s+|<[^>]*>|&[a-z]+;/gm, '')
        .replace(/\[(.*?)\]\(.*?\)/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .split('\n');

    const meaningfulLines: string[] = [];
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.length === 0) continue;

        if (line.includes('[!') || line.includes('build') || line.includes('license') || line.length < 10) continue;
        if (/^[#\s\-*+=!]+$/.test(line)) continue;

        meaningfulLines.push(line);
        if (meaningfulLines.length >= 3) break;
    }

    return meaningfulLines.join(' ').substring(0, 300);
}
