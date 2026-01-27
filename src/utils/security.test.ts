import { describe, it, expect } from 'vitest';
import { generateConfigId } from './security';

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
