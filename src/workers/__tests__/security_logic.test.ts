import { describe, it, expect } from 'vitest';

// Mock types
interface Config {
    type: 'username' | 'token';
    value: string;
    resolvedUsername?: string;
}

// The flawed logic currently in app.worker.ts
function getUsername_Flawed(config: Config) {
    return config.resolvedUsername || config.value;
}

// The fixed logic we will implement
function getUsername_Fixed(config: Config) {
    if (config.type === 'username') return config.value;
    return config.resolvedUsername;
}

describe('Security Logic Check', () => {
    it('Flawed logic leaks token as username', () => {
        const config: Config = { type: 'token', value: 'SECRET_TOKEN' };
        const username = getUsername_Flawed(config);
        expect(username).toBe('SECRET_TOKEN'); // 🚨 LEAK
    });

    it('Fixed logic does not leak token', () => {
        const config: Config = { type: 'token', value: 'SECRET_TOKEN' };
        const username = getUsername_Fixed(config);
        expect(username).toBeUndefined(); // ✅ SAFE
    });

     it('Fixed logic returns username when available for token type', () => {
        const config: Config = { type: 'token', value: 'SECRET_TOKEN', resolvedUsername: 'gandli' };
        const username = getUsername_Fixed(config);
        expect(username).toBe('gandli');
    });

    it('Fixed logic returns username when type is username', () => {
        const config: Config = { type: 'username', value: 'gandli' };
        const username = getUsername_Fixed(config);
        expect(username).toBe('gandli');
    });
});
