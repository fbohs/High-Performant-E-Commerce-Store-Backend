import { Kysely } from 'kysely';
import { DB } from './db';
import jwt from 'jsonwebtoken';

declare module 'fastify' {
    export interface FastifyInstance {
        db: Kysely<DB>;
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }

    export interface FastifyRequest {
        user?: string | jwt.JwtPayload;
    }
}
