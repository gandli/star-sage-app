import { describe, it, expect } from 'vitest';
import { generateConfigId, sanitizeUrl } from './security';

describe('generateConfigId', () => {
    it('hashes token values', async () => {
        const config = { type: 'token', value: 'ghp_secret123' };
        const id = await generateConfigId(config);

        expect(id).toMatch(/^token_[a-f0-9]{64}$/);
        expect(id).not.toContain('ghp_secret123');
    });

    it('returns consistent hash for same token', async () => {
        const config = { type: 'token', value: 'ghp_secret123' };
        const id1 = await generateConfigId(config);
        const id2 = await generateConfigId(config);

        expect(id1).toBe(id2);
    });

    it('does not hash username values', async () => {
        const config = { type: 'username', value: 'jules' };
        const id = await generateConfigId(config);

        expect(id).toBe('username_jules');
    });

    it('does not hash other types', async () => {
        const config = { type: 'other', value: 'something' };
        const id = await generateConfigId(config);

        expect(id).toBe('other_something');
    });
});

describe('sanitizeUrl', () => {
    it('allows valid http/https URLs', () => {
        expect(sanitizeUrl('https://google.com')).toBe('https://google.com');
        expect(sanitizeUrl('http://example.com/path?query=1')).toBe('http://example.com/path?query=1');
    });

    it('blocks javascript: URLs', () => {
        expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
        expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('#');
    });

    it('blocks other protocols', () => {
        expect(sanitizeUrl('ftp://example.com')).toBe('#');
        expect(sanitizeUrl('file:///etc/passwd')).toBe('#');
    });

    it('handles invalid URLs', () => {
        expect(sanitizeUrl('not-a-url')).toBe('#');
        expect(sanitizeUrl('')).toBe('#');
        expect(sanitizeUrl(null)).toBe('#');
        expect(sanitizeUrl(undefined)).toBe('#');
    });
});
