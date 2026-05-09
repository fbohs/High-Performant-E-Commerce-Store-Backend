import { build } from './app';
import { FastifyInstance } from 'fastify';

describe('Auth API', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await build();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /auth/login', () => {
        it('should return 400 when email is missing', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: { password: 'Password1!' },
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 400 when password is missing', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/login',
                payload: { email: 'test@example.com' },
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe('POST /auth/register', () => {
        it('should return 400 when email is missing', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { password: 'Password1!' },
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 400 when password is missing', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: { email: 'test@example.com' },
            });

            expect(response.statusCode).toBe(400);
        });

        it('should return 400 for invalid email format', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: {
                    email: 'invalid-email',
                    password: 'Password1!',
                },
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({ error: 'Invalid email format' });
        });

        it('should return 400 for password too short', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: {
                    email: 'test@example.com',
                    password: 'Ab1!',
                },
            });

            expect(response.statusCode).toBe(400);
            expect(response.json().error).toBe('Password does not meet requirements');
            expect(response.json().details).toContain('Password must be at least 8 characters');
        });

        it('should return 400 for password without uppercase', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: {
                    email: 'test@example.com',
                    password: 'password1!',
                },
            });

            expect(response.statusCode).toBe(400);
            expect(response.json().details).toContain(
                'Password must contain at least one uppercase letter'
            );
        });

        it('should return 400 for password without special character', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: {
                    email: 'test@example.com',
                    password: 'Password1',
                },
            });

            expect(response.statusCode).toBe(400);
            expect(response.json().details).toContain(
                'Password must contain at least one special character'
            );
        });

        it('should return 201 for a valid registration', async () => {
            const response = await app.inject({
                method: 'POST',
                url: '/auth/register',
                payload: {
                    email: 'valid@example.com',
                    password: 'Password1!',
                    name: 'Test User',
                },
            });

            expect(response.statusCode).toBe(201);
            expect(response.json().user).not.toHaveProperty('password');
            expect(response.json().user).toHaveProperty('email');
        });
    });
});
