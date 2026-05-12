import bcrypt from 'bcryptjs';

export const PASSWORD_RULES: { id: string; label: string; test: (p: string) => boolean }[] = [
    { id: 'min-length',  label: 'At least 8 characters',          test: (p) => p.length >= 8 },
    { id: 'max-length',  label: 'No more than 128 characters',     test: (p) => p.length <= 128 },
    { id: 'uppercase',   label: 'At least one uppercase letter',   test: (p) => /[A-Z]/.test(p) },
    { id: 'lowercase',   label: 'At least one lowercase letter',   test: (p) => /[a-z]/.test(p) },
    { id: 'digit',       label: 'At least one digit',              test: (p) => /[0-9]/.test(p) },
    { id: 'special',     label: 'At least one special character',  test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

export function validatePassword(plain: string): string | null {
    for (const rule of PASSWORD_RULES) {
        if (!rule.test(plain)) return rule.label;
    }
    return null;
}

export function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
}
