import { FastifyPluginAsync } from 'fastify';
import { randomBytes } from 'crypto';
import { updateTimestamp } from '../utils/db-helper';
import { validateEmail, validateName, validatePhone } from '../utils/validation';
import { validatePassword, hashPassword, verifyPassword } from '../utils/password';

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

async function createSession(
    fastify: Parameters<FastifyPluginAsync>[0],
    userId: string,
    email: string,
    role: string,
): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL * 1000);
    await fastify.db.insertInto('Session').values({ token, userId, expiresAt }).execute();
    await fastify.redis
        .setex(`session:${token}`, SESSION_TTL, JSON.stringify({ userId, email, role }))
        .catch(() => {});
    return token;
}

const auth: FastifyPluginAsync = async (fastify): Promise<void> => {
    // POST /auth/register
    fastify.post<{
        Body: { email: string; password: string; confirmPassword: string; phone: string; name: string };
    }>('/auth/register', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password', 'confirmPassword', 'phone', 'name'],
                additionalProperties: false,
                properties: {
                    email:           { type: 'string', format: 'email', maxLength: 254 },
                    password:        { type: 'string', minLength: 8, maxLength: 128 },
                    confirmPassword: { type: 'string', minLength: 1 },
                    phone:           { type: 'string', pattern: '^\\+?[0-9]{7,15}$' },
                    name:            { type: 'string', minLength: 2, maxLength: 100 },
                },
            },
        },
    }, async (request, reply) => {
        const { password, confirmPassword, phone } = request.body;
        const email = request.body.email.trim().toLowerCase();
        const name  = request.body.name.trim();

        if (password !== confirmPassword) {
            return reply.status(400).send({ error: 'Passwords do not match' });
        }

        const emailErr = validateEmail(email);
        if (emailErr) return reply.status(400).send({ error: emailErr });

        const nameErr = validateName(name);
        if (nameErr) return reply.status(400).send({ error: nameErr });

        const phoneErr = validatePhone(phone);
        if (phoneErr) return reply.status(400).send({ error: phoneErr });

        const passwordErr = validatePassword(password);
        if (passwordErr) return reply.status(400).send({ error: passwordErr });

        const existing = await fastify.db
            .selectFrom('User').select('id').where('email', '=', email).executeTakeFirst();
        if (existing) return reply.status(409).send({ error: 'Email already registered' });

        const hashed = await hashPassword(password);

        const newUser = await fastify.db
            .insertInto('User')
            .values({ email, password: hashed, name, phone: phone.replace(/\D/g, '') })
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
                    email:    { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 1 },
                },
            },
        },
    }, async (request, reply) => {
        const email = request.body.email.trim().toLowerCase();

        const user = await fastify.db
            .selectFrom('User').selectAll().where('email', '=', email).executeTakeFirst();

        if (!user || !(await verifyPassword(request.body.password, user.password))) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const token = await createSession(fastify, user.id, user.email, user.role);
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
                    name:  { type: 'string', minLength: 2, maxLength: 100 },
                    phone: { type: 'string', pattern: '^\\+?[0-9]{7,15}$' },
                },
            },
        },
    }, async (request, reply) => {
        const { id } = request.user;
        const { name, phone } = request.body;

        const updates: Record<string, unknown> = {};

        if (name !== undefined) {
            const nameErr = validateName(name);
            if (nameErr) return reply.status(400).send({ error: nameErr });
            updates.name = name.trim();
        }

        if (phone !== undefined) {
            const phoneErr = validatePhone(phone);
            if (phoneErr) return reply.status(400).send({ error: phoneErr });
            updates.phone = phone.replace(/\D/g, '');
        }

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
                    currentPassword: { type: 'string', minLength: 1 },
                    newPassword:     { type: 'string', minLength: 8, maxLength: 128 },
                },
            },
        },
    }, async (request, reply) => {
        const { id } = request.user;
        const { currentPassword, newPassword } = request.body;

        const user = await fastify.db
            .selectFrom('User').select(['id', 'password']).where('id', '=', id).executeTakeFirst();

        if (!user || !(await verifyPassword(currentPassword, user.password))) {
            return reply.status(401).send({ error: 'Current password is incorrect' });
        }

        const passwordErr = validatePassword(newPassword);
        if (passwordErr) return reply.status(400).send({ error: passwordErr });

        await fastify.db
            .updateTable('User')
            .set(updateTimestamp({ password: await hashPassword(newPassword) }))
            .where('id', '=', id)
            .execute();

        return reply.send({ message: 'Password updated successfully' });
    });

    // POST /auth/merchant/register
    fastify.post<{
        Body: { email: string; password: string; confirmPassword: string; phone: string; name: string };
    }>('/auth/merchant/register', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password', 'confirmPassword', 'phone', 'name'],
                additionalProperties: false,
                properties: {
                    name:            { type: 'string', minLength: 2, maxLength: 100 },
                    email:           { type: 'string', format: 'email' },
                    phone:           { type: 'string', pattern: '^\\+?[0-9]{7,15}$' },
                    password:        { type: 'string', minLength: 8, maxLength: 128 },
                    confirmPassword: { type: 'string', minLength: 1 },
                },
            },
        },
    }, async (request, reply) => {
        const { password, confirmPassword, phone } = request.body;
        const email = request.body.email.trim().toLowerCase();
        const name  = request.body.name.trim();

        if (password !== confirmPassword) {
            return reply.status(400).send({ error: 'Passwords do not match' });
        }

        const emailErr = validateEmail(email);
        if (emailErr) return reply.status(400).send({ error: emailErr });

        const nameErr = validateName(name);
        if (nameErr) return reply.status(400).send({ error: nameErr });

        const phoneErr = validatePhone(phone);
        if (phoneErr) return reply.status(400).send({ error: phoneErr });

        const passwordErr = validatePassword(password);
        if (passwordErr) return reply.status(400).send({ error: passwordErr });

        const existing = await fastify.db
            .selectFrom('User').select('id').where('email', '=', email).executeTakeFirst();
        if (existing) return reply.status(409).send({ error: 'Email already registered' });

        const hashed = await hashPassword(password);

        const newMerchant = await fastify.db
            .insertInto('User')
            .values({ email, password: hashed, name, phone: phone.replace(/\D/g, ''), role: 'MERCHANT' })
            .returning(['id', 'publicId', 'email', 'name', 'role'])
            .executeTakeFirst();

        const token = await createSession(fastify, newMerchant!.id, email, 'MERCHANT');

        return reply.status(201).send({
            token,
            user: { id: newMerchant!.publicId, email: newMerchant!.email, name: newMerchant!.name, role: newMerchant!.role },
        });
    });

    // POST /auth/merchant/login
    fastify.post<{
        Body: { email: string; password: string };
    }>('/auth/merchant/login', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                additionalProperties: false,
                properties: {
                    email:    { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 1 },
                },
            },
        },
    }, async (request, reply) => {
        const email = request.body.email.trim().toLowerCase();

        const emailErr = validateEmail(email);
        if (emailErr) return reply.status(400).send({ error: emailErr });

        const user = await fastify.db
            .selectFrom('User').selectAll().where('email', '=', email).executeTakeFirst();

        if (!user || user.role !== 'MERCHANT') {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        if (!(await verifyPassword(request.body.password, user.password))) {
            return reply.status(401).send({ error: 'Invalid credentials' });
        }

        const token = await createSession(fastify, user.id, user.email, user.role);
        return reply.send({
            token,
            user: { id: user.publicId, email: user.email, name: user.name, role: user.role },
        });
    });

    // POST /auth/logout
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
