import { PrismaClient } from "@prisma/client";

import { env } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var __stemBridgePrisma__: PrismaClient | undefined;
}

export const prisma =
  global.__stemBridgePrisma__ ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (env.NODE_ENV !== "production") {
  global.__stemBridgePrisma__ = prisma;
}

