import { FastifyPluginAsync } from 'fastify';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    fastify.get('/', async function (request, reply) {
        return { hello: 'world' };
    });

    fastify.get('/protected', {
        preHandler: [fastify.authenticate]
    } as any, async function (request, reply) {
        return { message: 'You are authenticated', user: request.user };
    });
};

export default root;
