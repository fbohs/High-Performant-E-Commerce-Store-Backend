import { validateEmail, validateName, validatePhone } from './validation';

describe('validateEmail', () => {
    it('returns null for a valid email', () => {
        expect(validateEmail('user@example.com')).toBeNull();
    });

    it('trims whitespace before validating', () => {
        expect(validateEmail('  user@example.com  ')).toBeNull();
    });

    it('returns error for empty string', () => {
        expect(validateEmail('')).not.toBeNull();
    });

    it('returns error for whitespace-only string', () => {
        expect(validateEmail('   ')).not.toBeNull();
    });

    it('returns error when @ is missing', () => {
        expect(validateEmail('userexample.com')).not.toBeNull();
    });

    it('returns error when domain is missing', () => {
        expect(validateEmail('user@')).not.toBeNull();
    });

    it('returns error when TLD is missing', () => {
        expect(validateEmail('user@example')).not.toBeNull();
    });

    it('returns error when local part contains spaces', () => {
        expect(validateEmail('us er@example.com')).not.toBeNull();
    });

    it('accepts subdomains', () => {
        expect(validateEmail('user@mail.example.com')).toBeNull();
    });
});

describe('validateName', () => {
    it('returns null for a 2-character name', () => {
        expect(validateName('Jo')).toBeNull();
    });

    it('returns null for a 100-character name', () => {
        expect(validateName('A'.repeat(100))).toBeNull();
    });

    it('returns null for a normal name', () => {
        expect(validateName('Jane Doe')).toBeNull();
    });

    it('trims whitespace before checking length', () => {
        expect(validateName('  Jo  ')).toBeNull();
    });

    it('returns error for 1-character name after trim', () => {
        expect(validateName('J')).not.toBeNull();
    });

    it('returns error for empty string', () => {
        expect(validateName('')).not.toBeNull();
    });

    it('returns error for whitespace-only string', () => {
        expect(validateName('   ')).not.toBeNull();
    });

    it('returns error for 101-character name', () => {
        expect(validateName('A'.repeat(101))).not.toBeNull();
    });

    it('accepts exactly 2 chars after trimming surrounding spaces', () => {
        expect(validateName(' AB ')).toBeNull();
    });
});

describe('validatePhone', () => {
    it('returns null for exactly 7 digits', () => {
        expect(validatePhone('1234567')).toBeNull();
    });

    it('returns null for exactly 15 digits', () => {
        expect(validatePhone('1'.repeat(15))).toBeNull();
    });

    it('returns null for a typical 10-digit number', () => {
        expect(validatePhone('8005551234')).toBeNull();
    });

    it('strips non-digit characters before counting', () => {
        expect(validatePhone('+1 (800) 555-1234')).toBeNull(); // 11 digits
    });

    it('returns error for 6 digits (too short)', () => {
        expect(validatePhone('123456')).not.toBeNull();
    });

    it('returns error for 16 digits (too long)', () => {
        expect(validatePhone('1'.repeat(16))).not.toBeNull();
    });

    it('returns error for empty string', () => {
        expect(validatePhone('')).not.toBeNull();
    });

    it('returns error when only non-digit characters are given', () => {
        expect(validatePhone('+++---')).not.toBeNull();
    });

    it('accepts E.164-style input with + prefix', () => {
        expect(validatePhone('+12025551234')).toBeNull(); // 11 digits
    });
});
