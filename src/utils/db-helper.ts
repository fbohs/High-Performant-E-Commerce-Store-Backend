/**
 * Adds createdAt and updatedAt timestamps to any object
 */
export const addTimestamps = <T extends Record<string, any>>(
    data: T
): T & { createdAt: Date; updatedAt: Date } => ({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
});
