import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

import { env } from "../config/env";

type GlobalPrisma = typeof globalThis & {
  __prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrisma;
const adapter = new PrismaPg({
  connectionString: env.databaseUrl
});

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    adapter,
    log: env.nodeEnv === "development" ? ["warn", "error"] : ["error"]
  });

if (env.nodeEnv !== "production") {
  globalForPrisma.__prisma = prisma;
}
