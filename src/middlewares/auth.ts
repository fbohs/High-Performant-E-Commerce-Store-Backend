import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';

export default fp(async (fastify) => {
    fastify.decorate('authenticate', async (request: any, reply: any) => {
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                throw new Error('No authorization header');
            }
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            request.user = decoded;
        } catch (err) {
            reply.code(401).send({ error: 'Unauthorized' });
        }
    });
});
