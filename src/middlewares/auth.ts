import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { Role } from '../types/db';

export default fp(async (fastify) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
    }

    fastify.register(fastifyJwt, { secret });

    fastify.decorate('authenticate', async (request: any, reply: any) => {
        try {
            await request.jwtVerify();

            const user = request.user as { jti?: string; exp?: number };
            if (user.jti) {
                const revoked = await fastify.redis.get(`blacklist:${user.jti}`).catch(() => null);
                if (revoked) {
                    return reply.code(401).send({ error: 'Token has been revoked' });
                }
            }
        } catch {
            reply.code(401).send({ error: 'Unauthorized' });
        }
    });

    fastify.decorate('authorizeRole', (roles: Role[]) => {
        return async (request: any, reply: any) => {
            try {
                await request.jwtVerify();
                const user = request.user as { role: Role };
                if (!roles.includes(user.role)) {
                    return reply.code(403).send({ error: 'Forbidden' });
                }
            } catch {
                reply.code(401).send({ error: 'Unauthorized' });
            }
        };
    });
});
