import { PASSWORD_RULES, validatePassword, hashPassword, verifyPassword } from './password';

describe('PASSWORD_RULES', () => {
    it('exports exactly 6 rules', () => {
        expect(PASSWORD_RULES).toHaveLength(6);
    });

    it('each rule has id, label, and test function', () => {
        for (const rule of PASSWORD_RULES) {
            expect(typeof rule.id).toBe('string');
            expect(typeof rule.label).toBe('string');
            expect(typeof rule.test).toBe('function');
        }
    });
});

describe('validatePassword', () => {
    const VALID = 'Secret1!';

    it('returns null for a password that satisfies all rules', () => {
        expect(validatePassword(VALID)).toBeNull();
    });

    it('returns an error when password is shorter than 8 characters', () => {
        expect(validatePassword('Sec1!')).not.toBeNull();
    });

    it('returns an error when password exceeds 128 characters', () => {
        expect(validatePassword('Aa1!' + 'x'.repeat(125))).not.toBeNull();
    });

    it('returns an error when there is no uppercase letter', () => {
        expect(validatePassword('secret1!')).not.toBeNull();
    });

    it('returns an error when there is no lowercase letter', () => {
        expect(validatePassword('SECRET1!')).not.toBeNull();
    });

    it('returns an error when there is no digit', () => {
        expect(validatePassword('SecretAB!')).not.toBeNull();
    });

    it('returns an error when there is no special character', () => {
        expect(validatePassword('Secret12')).not.toBeNull();
    });

    it('accepts passwords with various special characters', () => {
        expect(validatePassword('Secret1@')).toBeNull();
        expect(validatePassword('Secret1#')).toBeNull();
        expect(validatePassword('Secret1$')).toBeNull();
        expect(validatePassword('Secret1_')).toBeNull();
    });

    it('accepts a password exactly 8 characters long', () => {
        expect(validatePassword('Secret1!')).toBeNull();
    });

    it('accepts a password exactly 128 characters long', () => {
        // 4 fixed chars + 124 lowercase = 128 total
        expect(validatePassword('Aa1!' + 'a'.repeat(124))).toBeNull();
    });
});

describe('hashPassword / verifyPassword', () => {
    const PLAIN = 'Secret1!';

    it('produces a bcrypt hash that verifies correctly', async () => {
        const hash = await hashPassword(PLAIN);
        expect(hash).toMatch(/^\$2[ab]\$/);
        await expect(verifyPassword(PLAIN, hash)).resolves.toBe(true);
    }, 10_000);

    it('rejects an incorrect password against the hash', async () => {
        const hash = await hashPassword(PLAIN);
        await expect(verifyPassword('WrongPass1!', hash)).resolves.toBe(false);
    }, 10_000);

    it('produces a different hash each call (random salt)', async () => {
        const h1 = await hashPassword(PLAIN);
        const h2 = await hashPassword(PLAIN);
        expect(h1).not.toBe(h2);
    }, 20_000);
});
