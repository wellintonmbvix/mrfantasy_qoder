import { PrismaClient } from '@prisma/client';

type PrismaClientType = typeof PrismaClient;

const globalForPrisma = globalThis as unknown as {
	prisma: InstanceType<PrismaClientType> | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;