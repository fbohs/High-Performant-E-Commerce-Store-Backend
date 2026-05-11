import { FastifyPluginAsync } from 'fastify';

interface AddressBody {
    label?: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    isDefault?: boolean;
}

const addressBodySchema = {
    type: 'object',
    required: ['line1', 'city', 'state', 'country', 'postalCode'],
    properties: {
        label: { type: 'string', maxLength: 50 },
        line1: { type: 'string', maxLength: 200 },
        line2: { type: 'string', maxLength: 200 },
        city: { type: 'string', maxLength: 100 },
        state: { type: 'string', maxLength: 100 },
        country: { type: 'string', maxLength: 100 },
        postalCode: { type: 'string', maxLength: 20 },
        isDefault: { type: 'boolean' },
    },
};

const addresses: FastifyPluginAsync = async (fastify): Promise<void> => {
    // GET /users/me/addresses
    fastify.get('/users/me/addresses', {
        preHandler: [fastify.authenticate],
    }, async (request) => {
        const { id } = request.user;
        const list = await fastify.db
            .selectFrom('Address')
            .selectAll()
            .where('userId', '=', id)
            .orderBy('isDefault', 'desc')
            .orderBy('createdAt', 'desc')
            .execute();
        return { addresses: list };
    });

    // POST /users/me/addresses
    fastify.post<{ Body: AddressBody }>('/users/me/addresses', {
        preHandler: [fastify.authenticate],
        schema: { body: addressBodySchema },
    }, async (request, reply) => {
        const { id } = request.user;
        const { label, line1, line2, city, state, country, postalCode, isDefault = false } = request.body;

        // If this is the default address, clear other defaults first
        if (isDefault) {
            await fastify.db
                .updateTable('Address')
                .set({ isDefault: false, updatedAt: new Date() })
                .where('userId', '=', id)
                .execute();
        }

        const address = await fastify.db
            .insertInto('Address')
            .values({ userId: id, label: label || null, line1, line2: line2 || null, city, state, country, postalCode, isDefault })
            .returningAll()
            .executeTakeFirst();

        return reply.status(201).send({ address });
    });

    // PUT /users/me/addresses/:id
    fastify.put<{ Params: { id: string }; Body: Partial<AddressBody> }>('/users/me/addresses/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            body: {
                type: 'object',
                properties: addressBodySchema.properties,
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const addressId = Number(request.params.id);

        const existing = await fastify.db
            .selectFrom('Address')
            .select('id')
            .where('id', '=', addressId)
            .where('userId', '=', userId)
            .executeTakeFirst();

        if (!existing) {
            return reply.status(404).send({ error: 'Address not found' });
        }

        const { isDefault, ...rest } = request.body;

        if (isDefault) {
            await fastify.db
                .updateTable('Address')
                .set({ isDefault: false, updatedAt: new Date() })
                .where('userId', '=', userId)
                .execute();
        }

        const updates: Record<string, unknown> = { ...rest, updatedAt: new Date() };
        if (isDefault !== undefined) updates.isDefault = isDefault;

        const updated = await fastify.db
            .updateTable('Address')
            .set(updates)
            .where('id', '=', addressId)
            .returningAll()
            .executeTakeFirst();

        return reply.send({ address: updated });
    });

    // DELETE /users/me/addresses/:id
    fastify.delete<{ Params: { id: string } }>('/users/me/addresses/:id', {
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = request.user.id;
        const addressId = Number(request.params.id);

        const deleted = await fastify.db
            .deleteFrom('Address')
            .where('id', '=', addressId)
            .where('userId', '=', userId)
            .returning('id')
            .executeTakeFirst();

        if (!deleted) {
            return reply.status(404).send({ error: 'Address not found' });
        }

        return reply.status(204).send();
    });
};

export default addresses;
