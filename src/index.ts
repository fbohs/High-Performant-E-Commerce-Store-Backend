import Fastify, { FastifyInstance } from 'fastify';
import dbPlugin from './plugins/db';
import authPlugin from './middlewares/auth';
import rootRoutes from './routes/root';
import usersRoutes from './routes/users';
import 'dotenv/config';

const fastify = Fastify({
    logger: true
});

// Register plugins
fastify.register(dbPlugin);
fastify.register(authPlugin);
fastify.register(rootRoutes);
fastify.register(usersRoutes);

const start = async () => {
    try {
        const port = Number(process.env.PORT) || 3000;
        await fastify.listen({ port, host: '0.0.0.0' });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
