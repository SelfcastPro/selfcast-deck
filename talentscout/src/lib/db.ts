import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const hasDatabaseUrl =
  typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0;

const prismaClient = hasDatabaseUrl ? globalForPrisma.prisma ?? new PrismaClient() : undefined;

if (prismaClient && process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;
export const isDatabaseEnabled = Boolean(prismaClient);
