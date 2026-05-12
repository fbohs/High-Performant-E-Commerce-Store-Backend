import fp from 'fastify-plugin';
import { Role } from '../types/db';

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export default fp(async (fastify) => {
    fastify.decorate('authenticate', async (request: any, reply: any) => {
        const authHeader = request.headers.authorization as string | undefined;
        if (!authHeader?.startsWith('Bearer ')) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        const token = authHeader.slice(7);
        if (!token) {
            return reply.code(401).send({ error: 'Unauthorized' });
        }

        // Fast path: Redis lookup
        let sessionData: { userId: string; email: string; role: Role } | null = null;

        const cached = await fastify.redis.get(`session:${token}`).catch(() => null);
        if (cached) {
            try {
                sessionData = JSON.parse(cached);
            } catch {
                // invalid cached data, fall through to DB
            }
        }

        // Fallback: DB lookup + re-cache
        if (!sessionData) {
            const session = await fastify.db
                .selectFrom('Session')
                .innerJoin('User', 'User.id', 'Session.userId')
                .select(['User.id as userId', 'User.email', 'User.role'])
                .where('Session.token', '=', token)
                .where('Session.expiresAt', '>', new Date())
                .executeTakeFirst();

            if (!session) {
                return reply.code(401).send({ error: 'Unauthorized' });
            }

            sessionData = { userId: session.userId, email: session.email, role: session.role };
            await fastify.redis
                .setex(`session:${token}`, SESSION_TTL, JSON.stringify(sessionData))
                .catch(() => {});
        }

        request.user = {
            id: sessionData!.userId,
            email: sessionData!.email,
            role: sessionData!.role,
            sessionToken: token,
        };
    });

    fastify.decorate('authorizeRole', (roles: Role[]) => {
        return async (request: any, reply: any) => {
            await fastify.authenticate(request, reply);
            if (reply.sent) return;

            const user = request.user as { role: Role };
            if (!roles.includes(user.role)) {
                return reply.code(403).send({ error: 'Forbidden' });
            }
        };
    });
});
