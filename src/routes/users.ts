import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';

interface UsersBody {
    email: string;
}

interface RegisterBody {
    email: string;
    password: string;
    name?: string;
}

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    number: /[0-9]/,
    special: /[!@#$%^&*(),.?":{}|<>]/
};

// Sanitize and validate email
function sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

// Validate email format
function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email) && email.length <= 254;
}

// Validate password strength
function validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < PASSWORD_MIN_LENGTH) {
        errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!PASSWORD_REGEX.uppercase.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!PASSWORD_REGEX.lowercase.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!PASSWORD_REGEX.number.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!PASSWORD_REGEX.special.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return { valid: errors.length === 0, errors };
}

// Sanitize name input
function sanitizeName(name: string | undefined): string | null {
    if (!name) return null;
    // Remove extra whitespace, trim, and limit length
    return name.trim().replace(/\s+/g, ' ').slice(0, 100);
}

const users: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    // Get users by email
    fastify.post<{ Body: UsersBody }>('/users', async function (request, reply) {
        const { email } = request.body;

        if (!email) {
            return reply.status(400).send({ error: 'Email is required' });
        }

        const sanitizedEmail = sanitizeEmail(email);

        const usersList = await fastify.db
            .selectFrom('User')
            .selectAll()
            .where('email', '=', sanitizedEmail)
            .execute();

        return { users: usersList };
    });

    // Register new user
    fastify.post<{ Body: RegisterBody }>('/users/register', async function (request, reply) {
        const { email, password, name } = request.body;

        // Validate required fields
        if (!email || !password) {
            return reply.status(400).send({ error: 'Email and password are required' });
        }

        // Sanitize inputs
        const sanitizedEmail = sanitizeEmail(email);
        const sanitizedName = sanitizeName(name);

        // Validate email format
        if (!isValidEmail(sanitizedEmail)) {
            return reply.status(400).send({ error: 'Invalid email format' });
        }

        // Validate password strength
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            return reply.status(400).send({
                error: 'Password does not meet requirements',
                details: passwordValidation.errors
            });
        }

        // Check for existing user
        const existingUser = await fastify.db
            .selectFrom('User')
            .select('id')
            .where('email', '=', sanitizedEmail)
            .executeTakeFirst();

        if (existingUser) {
            return reply.status(409).send({ error: 'Email already registered' });
        }

        // Hash password with bcrypt (cost factor 12)
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert new user
        const newUser = await fastify.db
            .insertInto('User')
            .values({
                email: sanitizedEmail,
                password: hashedPassword,
                name: sanitizedName
            })
            .returning(['id', 'email', 'name'])
            .executeTakeFirst();

        return reply.status(201).send({
            message: 'User registered successfully',
            user: newUser
        });
    });
};

export default users;
