import Fastify from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { Kysely } from 'kysely';
import Redis from 'ioredis';
import { DB, Role } from '../types/db';
import authRoutes from './auth';
import userRoutes from './users';

// Minimal in-memory mock DB satisfying Kysely<DB> interface for unit tests.
// Tests that require real DB access should use an integration test setup.
function createMockDb() {
    const noop = () => ({
        selectAll: () => ({ where: () => ({ execute: async () => [] }) }),
        select: (_cols: any) => ({
            where: () => ({
                execute: async () => [],
                executeTakeFirst: async () => null,
                limit: () => ({ offset: () => ({ execute: async () => [] }) }),
            }),
            limit: () => ({ offset: () => ({ execute: async () => [] }) }),
            executeTakeFirst: async () => null,
            execute: async () => [],
        }),
        where: () => ({ executeTakeFirst: async () => null, execute: async () => [] }),
        execute: async () => [],
        executeTakeFirst: async () => null,
    });

    return {
        selectFrom: noop,
        insertInto: () => ({
            values: () => ({
                returning: () => ({ executeTakeFirst: async () => ({ id: 1, email: 'test@test.com', name: null, role: 'USER' }) }),
                returningAll: () => ({ executeTakeFirst: async () => null }),
                execute: async () => [],
            }),
        }),
        updateTable: () => ({ set: () => ({ where: () => ({ execute: async () => [], returning: () => ({ executeTakeFirst: async () => null }) }) }) }),
        deleteFrom: () => ({ where: () => ({ returning: () => ({ executeTakeFirst: async () => null }), execute: async () => [] }) }),
        fn: { countAll: () => ({ as: () => null }), avg: () => ({ as: () => null }) },
        transaction: () => ({ execute: async (fn: any) => fn({}) }),
    } as unknown as Kysely<DB>;
}

function createMockRedis() {
    return {
        get: async () => null,
        setex: async () => null,
        quit: async () => null,
        on: () => {},
    } as unknown as Redis;
}

export async function build() {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-production';

    const app = Fastify();

    // Register mock DB and Redis
    app.register(fp(async (fastify) => {
        fastify.decorate('db', createMockDb());
        fastify.decorate('redis', createMockRedis());
    }));

    // Register JWT + auth decorators
    app.register(fp(async (fastify) => {
        await fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET! });

        fastify.decorate('authenticate', async (request: any, reply: any) => {
            try {
                await request.jwtVerify();
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
    }));

    app.register(authRoutes);
    app.register(userRoutes);

    await app.ready();
    return app;
}
