import { FastifyPluginAsync } from 'fastify';

const root: FastifyPluginAsync = async (fastify): Promise<void> => {
    fastify.get('/', async () => {
        return { hello: 'world' };
    });

    fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    fastify.get('/protected', {
        preHandler: [fastify.authenticate]
    } as any, async function (request) {
        return { message: 'You are authenticated', user: request.user };
    });
};

export default root;
