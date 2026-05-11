/**
 * Adds an updatedAt timestamp for update operations.
 */
export const updateTimestamp = <T extends Record<string, any>>(
    data: T = {} as T
): T & { updatedAt: Date } => ({
    ...data,
    updatedAt: new Date(),
});
