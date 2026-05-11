import { Kysely } from 'kysely';
import { DB, Role } from './db';
import Redis from 'ioredis';

declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: {
            id: string;
            email: string;
            role: Role;
            jti?: string;
            iat?: number;
            exp?: number;
        };
    }
}

declare module 'fastify' {
    export interface FastifyInstance {
        db: Kysely<DB>;
        redis: Redis;
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
        authorizeRole: (
            roles: Role[]
        ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}
