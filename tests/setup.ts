import { beforeEach, vi } from "vitest";

import { resetPrismaMock } from "./helpers/prisma-mock";

process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.DATABASE_URL = "postgresql://stembridge:test@localhost:5432/stembridge_test";
process.env.JWT_SECRET = "test-secret-key-with-sufficient-length";
process.env.JWT_EXPIRES_IN = "7d";
process.env.CORS_ORIGINS = "http://localhost:3000";
process.env.JSON_BODY_LIMIT = "1mb";
process.env.URL_ENCODED_BODY_LIMIT = "100kb";
process.env.AUTH_RATE_LIMIT_WINDOW_MS = "900000";
process.env.AUTH_RATE_LIMIT_MAX = "1000";
process.env.UPLOAD_FILE_SIZE_LIMIT_BYTES = "10485760";
process.env.S3_REGION = "us-west-2";
process.env.S3_BUCKET = "stembridge-test";
process.env.AWS_ACCESS_KEY_ID = "test-access-key";
process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
process.env.APP_BASE_URL = "http://localhost:4000";

vi.mock("../src/lib/prisma", async () => {
  const prismaModule = await import("./helpers/prisma-mock");

  return {
    prisma: prismaModule.prismaMock
  };
});

beforeEach(() => {
  resetPrismaMock();
});
