// src/routes/app.ts (create this helper)
import Fastify from 'fastify';
import userRoutes from './users';

export async function build() {
    const app = Fastify();
    app.register(userRoutes);
    return app;
}
