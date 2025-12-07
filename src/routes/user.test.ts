import { build } from './app';
import { FastifyInstance } from 'fastify';

describe('Users API', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await build();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /users', () => {
        it('should return 400 when email is not provided', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/users',
                payload: {}
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({ error: 'Email is required' });
        });
    });

    describe('POST /users/register', () => {
        it('should return 400 when email is missing', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/users/register',
                payload: { password: 'Password1!' }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({ error: 'Email and password are required' });
        });

        it('should return 400 when password is missing', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/users/register',
                payload: { email: 'test@example.com' }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({ error: 'Email and password are required' });
        });

        it('should return 400 for invalid email format', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/users/register',
                payload: {
                    email: 'invalid-email',
                    password: 'Password1!'
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({ error: 'Invalid email format' });
        });

        it('should return 400 for weak password - too short', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/users/register',
                payload: {
                    email: 'test@example.com',
                    password: 'Ab1!'
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json().error).toBe('Password does not meet requirements');
            expect(response.json().details).toContain('Password must be at least 8 characters');
        });

        it('should return 400 for password without uppercase', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/users/register',
                payload: {
                    email: 'test@example.com',
                    password: 'password1!'
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json().details).toContain('Password must contain at least one uppercase letter');
        });

        it('should return 400 for password without special character', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/users/register',
                payload: {
                    email: 'test@example.com',
                    password: 'Password1'
                }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json().details).toContain('Password must contain at least one special character');
        });
    });
});
