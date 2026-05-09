import { FastifyPluginAsync } from 'fastify';

const users: FastifyPluginAsync = async (fastify): Promise<void> => {
    // GET /users — admin only, search/list users
    fastify.get<{
        Querystring: { email?: string; page?: number; limit?: number };
    }>('/users', {
        preHandler: [fastify.authorizeRole(['ADMIN'])],
        schema: {
            querystring: {
                type: 'object',
                properties: {
                    email: { type: 'string' },
                    page: { type: 'integer', minimum: 1, default: 1 },
                    limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                },
            },
        },
    }, async (request) => {
        const { email, page = 1, limit = 20 } = request.query;
        const offset = (page - 1) * limit;

        let query = fastify.db
            .selectFrom('User')
            .select(['id', 'email', 'name', 'phone', 'role', 'isVerified', 'createdAt']);

        if (email) {
            query = query.where('email', 'like', `%${email.toLowerCase()}%`);
        }

        const [users, total] = await Promise.all([
            query.limit(limit).offset(offset).execute(),
            fastify.db
                .selectFrom('User')
                .select(fastify.db.fn.countAll<number>().as('count'))
                .executeTakeFirst(),
        ]);

        return { users, pagination: { page, limit, total: total?.count ?? 0 } };
    });

    // GET /users/:id — own profile or admin
    fastify.get<{ Params: { id: string } }>('/users/:id', {
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const targetId = Number(request.params.id);
        const { id: requesterId, role } = request.user;

        if (role !== 'ADMIN' && requesterId !== targetId) {
            return reply.status(403).send({ error: 'Forbidden' });
        }

        const user = await fastify.db
            .selectFrom('User')
            .select(['id', 'email', 'name', 'phone', 'role', 'isVerified', 'createdAt'])
            .where('id', '=', targetId)
            .executeTakeFirst();

        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return { user };
    });

    // DELETE /users/:id — own account or admin
    fastify.delete<{ Params: { id: string } }>('/users/:id', {
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const targetId = Number(request.params.id);
        const { id: requesterId, role } = request.user;

        if (role !== 'ADMIN' && requesterId !== targetId) {
            return reply.status(403).send({ error: 'Forbidden' });
        }

        const deleted = await fastify.db
            .deleteFrom('User')
            .where('id', '=', targetId)
            .returning('id')
            .executeTakeFirst();

        if (!deleted) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return reply.status(204).send();
    });
};

export default users;
