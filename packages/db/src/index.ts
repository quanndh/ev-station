import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PrismaClient as PrismaClientType } from "@prisma/client";
import dotenv from "dotenv";

const require = createRequire(import.meta.url);
// `@prisma/client` is published as CJS; load it safely from ESM.
const { PrismaClient } = require("@prisma/client") as unknown as {
  PrismaClient: new (...args: any[]) => PrismaClientType;
};

// PrismaClient singleton to avoid exhausting connections in dev/edge-like environments.
// In production, process count is typically low; for serverless you may want to adjust strategy.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClientType };

// Monorepo dev convenience:
// - Next.js loads env files from apps/web, so DATABASE_URL may not be present.
// - Try to load repo root `.env` before failing.
if (!process.env.DATABASE_URL) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRootEnv = path.resolve(here, "../../../.env");
  dotenv.config({ path: repoRootEnv });
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "Missing DATABASE_URL. Add it to environment (e.g. apps/web/.env.local) or repo root .env.",
  );
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
