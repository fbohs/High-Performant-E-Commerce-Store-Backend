import fp from 'fastify-plugin';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { DB } from '../types/db';

export default fp(async (fastify) => {
    const db = new Kysely<DB>({
        dialect: new PostgresDialect({
            pool: new Pool({
                connectionString: process.env.DATABASE_URL
            })
        })
    });

    fastify.decorate('db', db);

    fastify.addHook('onClose', async (instance) => {
        await instance.db.destroy();
    });
});
