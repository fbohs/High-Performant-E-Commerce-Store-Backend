const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
    const trimmed = email.trim();
    if (!trimmed) return 'Email is required';
    if (!EMAIL_RE.test(trimmed)) return 'Invalid email format';
    return null;
}

export function validateName(name: string): string | null {
    const trimmed = name.trim();
    if (trimmed.length < 2) return 'Name must be at least 2 characters';
    if (trimmed.length > 100) return 'Name must be at most 100 characters';
    return null;
}

export function validatePhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) return 'Phone number must be at least 7 digits';
    if (digits.length > 15) return 'Phone number must be at most 15 digits';
    return null;
}
