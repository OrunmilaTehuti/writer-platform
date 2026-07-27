import { PrismaClient } from "./generated/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";

// Using Prisma's Neon driver adapter instead of the default engine binary.
// This connects over HTTP/WebSocket rather than a native binary + raw TCP
// connection, which sidesteps the "Query Engine binary not found" class of
// bundling issues entirely on serverless platforms like Vercel.
neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL || "";

// Reuse a single client (and pool) across hot reloads in dev
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "./generated/client";
