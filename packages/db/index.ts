import { PrismaClient } from "./generated/client";

const connectionString = process.env.DATABASE_URL || "";
// Neon's serverless driver only speaks to Neon's own WebSocket proxy - it
// can't connect to a plain local Postgres server. So: use the Neon driver
// adapter (which avoids the native engine binary, needed for Vercel) only
// when actually pointed at Neon; fall back to Prisma's normal client
// (native engine, plain TCP) for local development against local Postgres.
const isNeon = connectionString.includes("neon.tech");

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  if (isNeon) {
    const { Pool, neonConfig } = require("@neondatabase/serverless");
    const { PrismaNeon } = require("@prisma/adapter-neon");
    const ws = require("ws");
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "./generated/client";
