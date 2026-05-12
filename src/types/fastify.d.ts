import { Kysely } from 'kysely';
import { DB, Role } from './db';
import Redis from 'ioredis';

declare module 'fastify' {
    interface FastifyRequest {
        user: {
            id: string;
            email: string;
            role: Role;
            sessionToken: string;
        };
    }

    interface FastifyInstance {
        db: Kysely<DB>;
        redis: Redis;
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        authorizeRole: (
            roles: Role[]
        ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
