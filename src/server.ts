import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { logger } from "./utils/logger";

const startServer = async () => {
  await prisma.$connect();

  const server = app.listen(env.port, () => {
    logger.info(`StemBridge API listening on port ${env.port}.`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down.`);

    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("unhandledRejection", (error) => {
    logger.error("Unhandled rejection.", error);
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception.", error);
  });
};

void startServer().catch(async (error) => {
  logger.error("Failed to start server.", error);
  await prisma.$disconnect();
  process.exit(1);
});
