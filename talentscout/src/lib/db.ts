import { PrismaClient } from '@prisma/client';
import { normalizeDatabaseUrl } from './database-url';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

const prismaClient = databaseUrl ? globalForPrisma.prisma ?? new PrismaClient() : undefined;

if (prismaClient && process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;
export const isDatabaseEnabled = Boolean(prismaClient);
