import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import 'dotenv/config';

import dbPlugin from './plugins/db';
import redisPlugin from './plugins/redis';
import authPlugin from './middlewares/auth';

import rootRoutes from './routes/root';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import addressRoutes from './routes/addresses';
import categoryRoutes from './routes/categories';
import productRoutes from './routes/products';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/orders';

const fastify = Fastify({ logger: true });

// Security
fastify.register(fastifyHelmet);
fastify.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || false,
    credentials: true,
});

// Infrastructure plugins
fastify.register(dbPlugin);
fastify.register(redisPlugin);

// Rate limiting (uses Redis when available for distributed counting across instances)
fastify.register(fastifyRateLimit, {
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.headers['x-forwarded-for'] as string || req.ip,
    errorResponseBuilder: () => ({ error: 'Too many requests, please slow down.' }),
});

// Auth (registers @fastify/jwt + decorates authenticate + authorizeRole)
fastify.register(authPlugin);

// Routes
fastify.register(rootRoutes);
fastify.register(authRoutes);
fastify.register(userRoutes);
fastify.register(addressRoutes);
fastify.register(categoryRoutes);
fastify.register(productRoutes);
fastify.register(cartRoutes);
fastify.register(orderRoutes);

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
