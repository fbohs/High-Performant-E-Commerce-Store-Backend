import fp from 'fastify-plugin';
import Redis from 'ioredis';

export default fp(async (fastify) => {
    const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        lazyConnect: true,
    });

    redis.on('error', (err) => {
        fastify.log.warn({ err }, 'Redis connection error');
    });

    try {
        await redis.connect();
        fastify.log.info('Redis connected');
    } catch (err) {
        fastify.log.warn({ err }, 'Redis unavailable — token blacklist and distributed rate-limit disabled');
    }

    fastify.decorate('redis', redis);

    fastify.addHook('onClose', async () => {
        await redis.quit();
    });
});
