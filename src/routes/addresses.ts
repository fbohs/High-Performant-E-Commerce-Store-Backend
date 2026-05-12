import { FastifyPluginAsync } from 'fastify';
import { updateTimestamp } from '../utils/db-helper';

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

const ADDRESS_PUBLIC_COLUMNS = [
    'publicId',
    'label',
    'line1',
    'line2',
    'city',
    'state',
    'country',
    'postalCode',
    'isDefault',
    'createdAt',
    'updatedAt',
] as const;

const addressBodySchema = {
    type: 'object',
    required: ['line1', 'city', 'state', 'country', 'postalCode'],
    additionalProperties: false,
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
            .select(ADDRESS_PUBLIC_COLUMNS)
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

        const address = await fastify.db.transaction().execute(async (tx) => {
            if (isDefault) {
                await tx
                    .updateTable('Address')
                    .set(updateTimestamp({ isDefault: false }))
                    .where('userId', '=', id)
                    .execute();
            }

            return tx
                .insertInto('Address')
                .values({ userId: id, label: label || null, line1, line2: line2 || null, city, state, country, postalCode, isDefault })
                .returning(ADDRESS_PUBLIC_COLUMNS)
                .executeTakeFirst();
        });

        return reply.status(201).send({ address });
    });

    // PUT /users/me/addresses/:publicId
    fastify.put<{ Params: { publicId: string }; Body: Partial<AddressBody> }>('/users/me/addresses/:publicId', {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: 'object',
                required: ['publicId'],
                properties: { publicId: { type: 'string', format: 'uuid' } },
            },
            body: {
                type: 'object',
                properties: addressBodySchema.properties,
                additionalProperties: false,
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { publicId } = request.params;

        const existing = await fastify.db
            .selectFrom('Address')
            .select('id')
            .where('publicId', '=', publicId)
            .where('userId', '=', userId)
            .executeTakeFirst();

        if (!existing) {
            return reply.status(404).send({ error: 'Address not found' });
        }

        const { label, line1, line2, city, state, country, postalCode, isDefault } = request.body;

        const updates: Record<string, unknown> = {};
        if (label !== undefined) updates.label = label || null;
        if (line1 !== undefined) updates.line1 = line1;
        if (line2 !== undefined) updates.line2 = line2 || null;
        if (city !== undefined) updates.city = city;
        if (state !== undefined) updates.state = state;
        if (country !== undefined) updates.country = country;
        if (postalCode !== undefined) updates.postalCode = postalCode;
        if (isDefault !== undefined) updates.isDefault = isDefault;

        if (Object.keys(updates).length === 0) {
            return reply.status(400).send({ error: 'No updatable fields provided' });
        }

        const updated = await fastify.db.transaction().execute(async (tx) => {
            if (isDefault) {
                await tx
                    .updateTable('Address')
                    .set(updateTimestamp({ isDefault: false }))
                    .where('userId', '=', userId)
                    .execute();
            }

            return tx
                .updateTable('Address')
                .set(updateTimestamp(updates))
                .where('id', '=', existing.id)
                .returning(ADDRESS_PUBLIC_COLUMNS)
                .executeTakeFirst();
        });

        return reply.send({ address: updated });
    });

    // DELETE /users/me/addresses/:publicId
    fastify.delete<{ Params: { publicId: string } }>('/users/me/addresses/:publicId', {
        preHandler: [fastify.authenticate],
        schema: {
            params: {
                type: 'object',
                required: ['publicId'],
                properties: { publicId: { type: 'string', format: 'uuid' } },
            },
        },
    }, async (request, reply) => {
        const userId = request.user.id;
        const { publicId } = request.params;

        const deleted = await fastify.db
            .deleteFrom('Address')
            .where('publicId', '=', publicId)
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
