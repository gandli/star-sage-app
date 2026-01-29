export async function generateConfigId(config: { type: string; value: string }): Promise<string> {
    if (config.type === 'token') {
        const msgBuffer = new TextEncoder().encode(config.value);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `token_${hashHex}`;
    }
    return `${config.type}_${config.value}`;
}

/**
 * Sanitizes a URL to ensure it uses a safe protocol (http/https).
 * Returns '#' if the URL is invalid or unsafe.
 */
export function sanitizeUrl(url: string | undefined | null): string {
    if (!url) return '#';
    try {
        const parsed = new URL(url);
        return ['http:', 'https:'].includes(parsed.protocol) ? url : '#';
    } catch {
        return '#';
    }
}
