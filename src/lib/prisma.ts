import { PrismaClient } from "@prisma/client";

import { env } from "../config/env";

type GlobalPrisma = typeof globalThis & {
  __prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalPrisma;

export const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: env.nodeEnv === "development" ? ["warn", "error"] : ["error"]
  });

if (env.nodeEnv !== "production") {
  globalForPrisma.__prisma = prisma;
}
