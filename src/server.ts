import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./database/prisma";

const startServer = async () => {
  await prisma.$connect();

  const server = app.listen(env.PORT, () => {
    console.log(`StemBridge API listening on port ${env.PORT}.`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down.`);

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
    console.error("Unhandled rejection:", error);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
  });
};

void startServer().catch(async (error) => {
  console.error("Failed to start server:", error);
  await prisma.$disconnect();
  process.exit(1);
});
