import { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { updateTimestamp } from '../utils/db-helper';

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

const EMAIL_REGEX =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email) && email.length <= 254;
}

function validatePassword(password: string): string[] {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
        errors.push('Password must contain at least one special character');
    return errors;
}

const auth: FastifyPluginAsync = async (fastify): Promise<void> => {
    // POST /auth/register
    fastify.post<{
        Body: { email: string; password: string; name?: string; phone?: string };
    }>('/auth/register', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                additionalProperties: false,
                properties: {
                    email: { type: 'string', maxLength: 254 },
                    password: { type: 'string', maxLength: 128 },
                    name: { type: 'string', maxLength: 100 },
                    phone: { type: 'string', maxLength: 20 },
                },
            },
        },
    }, async (request, reply) => {
        const { password, name, phone } = request.body;
        const email = request.body.email.trim().toLowerCase();

        if (!isValidEmail(email)) {
            return reply.status(400).send({ error: 'Invalid email format' });
        }

        const passwordErrors = validatePassword(password);
        if (passwordErrors.length) {
            return reply.status(400).send({
                error: 'Password does not meet requirements',
                details: passwordErrors,
            });
        }

        const existing = await fastify.db
            .selectFrom('User')
            .select('id')
            .where('email', '=', email)
            .executeTakeFirst();

        if (existing) {
            return reply.status(409).send({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const sanitizedName = name ? name.trim().replace(/\s+/g, ' ').slice(0, 100) : null;

        const newUser = await fastify.db
            .insertInto('User')
            .values({
                email,
                password: hashedPassword,
                name: sanitizedName,
                phone: phone?.trim() || null,
            })
            .returning(['publicId as id', 'email', 'name', 'role'])
            .executeTakeFirst();

        return reply.status(201).send({
            message: 'User registered successfully',
            user: newUser,
        });
    });

    // POST /auth/login
    fastify.post<{
        Body: { email: string; password: string };
    }>('/auth/login', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                additionalProperties: false,
                properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const email = request.body.email.trim().toLowerCase();

        const user = await fastify.db
            .selectFrom('User')
            .selectAll()
            .where('email', '=', email)
            .executeTakeFirst();

        if (!user) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(request.body.password, user.password);
        if (!valid) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);

        await fastify.db
            .insertInto('Session')
            .values({ token, userId: user.id, expiresAt })
            .execute();

        await fastify.redis
            .setex(
                `session:${token}`,
                SESSION_TTL,
                JSON.stringify({ userId: user.id, email: user.email, role: user.role })
            )
            .catch(() => {});

        return reply.send({
            token,
            user: { id: user.publicId, email: user.email, name: user.name, role: user.role },
        });
    });

    // PUT /auth/me
    fastify.put<{
        Body: { name?: string; phone?: string };
    }>('/auth/me', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    name: { type: 'string', maxLength: 100 },
                    phone: { type: 'string', maxLength: 20 },
                },
            },
        },
    }, async (request, reply) => {
        const { id } = request.user;
        const { name, phone } = request.body;

        const updates: Record<string, unknown> = {};
        if (name !== undefined) updates.name = name.trim().replace(/\s+/g, ' ').slice(0, 100);
        if (phone !== undefined) updates.phone = phone.trim() || null;

        if (Object.keys(updates).length === 0) {
            return reply.status(400).send({ error: 'No updatable fields provided' });
        }

        const updated = await fastify.db
            .updateTable('User')
            .set(updateTimestamp(updates))
            .where('id', '=', id)
            .returning(['publicId as id', 'email', 'name', 'phone', 'role'])
            .executeTakeFirst();

        return reply.send({ user: updated });
    });

    // PUT /auth/change-password
    fastify.put<{
        Body: { currentPassword: string; newPassword: string };
    }>('/auth/change-password', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                additionalProperties: false,
                properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string', minLength: 8, maxLength: 128 },
                },
            },
        },
    }, async (request, reply) => {
        const { id } = request.user;
        const { currentPassword, newPassword } = request.body;

        const user = await fastify.db
            .selectFrom('User')
            .select(['id', 'password'])
            .where('id', '=', id)
            .executeTakeFirst();

        if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
            return reply.status(401).send({ error: 'Current password is incorrect' });
        }

        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length) {
            return reply.status(400).send({
                error: 'Password does not meet requirements',
                details: passwordErrors,
            });
        }

        await fastify.db
            .updateTable('User')
            .set(updateTimestamp({ password: await bcrypt.hash(newPassword, 12) }))
            .where('id', '=', id)
            .execute();

        return reply.send({ message: 'Password updated successfully' });
    });

    // POST /auth/logout — invalidates the current session
    fastify.post('/auth/logout', {
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const { sessionToken } = request.user;

        await Promise.all([
            fastify.redis.del(`session:${sessionToken}`).catch(() => {}),
            fastify.db.deleteFrom('Session').where('token', '=', sessionToken).execute(),
        ]);

        return reply.send({ message: 'Logged out successfully' });
    });
};

export default auth;
