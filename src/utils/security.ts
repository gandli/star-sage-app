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
