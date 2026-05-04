import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const parseCorsOrigins = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value;
};

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
    DIRECT_DATABASE_URL: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
    JWT_SECRET: z.string().min(1, "JWT_SECRET is required."),
    JWT_EXPIRES_IN: z.string().min(1, "JWT_EXPIRES_IN is required."),
    CORS_ORIGINS: z.preprocess(
      parseCorsOrigins,
      z
        .array(z.string().url())
        .or(z.array(z.literal("*")))
        .optional()
    ),
    JSON_BODY_LIMIT: z.string().min(1).default("1mb"),
    URL_ENCODED_BODY_LIMIT: z.string().min(1).default("100kb"),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    UPLOAD_FILE_SIZE_LIMIT_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(100 * 1024 * 1024),
    S3_REGION: z.string().min(1, "S3_REGION is required."),
    S3_BUCKET: z.string().min(1, "S3_BUCKET is required."),
    AWS_ACCESS_KEY_ID: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
    AWS_SECRET_ACCESS_KEY: z.preprocess(emptyStringToUndefined, z.string().min(1).optional()),
    APP_BASE_URL: z.string().url("APP_BASE_URL must be a valid URL.")
  })
  .superRefine((config, context) => {
    if (
      (config.AWS_ACCESS_KEY_ID && !config.AWS_SECRET_ACCESS_KEY) ||
      (!config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["AWS_ACCESS_KEY_ID"],
        message:
          "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must either both be set or both be omitted."
      });
    }

    if (config.NODE_ENV !== "production") {
      return;
    }

    if (config.JWT_SECRET.length < 32) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET"],
        message: "JWT_SECRET must be at least 32 characters in production."
      });
    }

    if (config.CORS_ORIGINS?.includes("*")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGINS"],
        message: "CORS_ORIGINS cannot include * in production."
      });
    }

  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration.", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Environment validation failed.");
}

export const env = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  directDatabaseUrl: parsedEnv.data.DIRECT_DATABASE_URL,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  jwtExpiresIn: parsedEnv.data.JWT_EXPIRES_IN,
  corsOrigins: parsedEnv.data.CORS_ORIGINS ?? [parsedEnv.data.APP_BASE_URL],
  jsonBodyLimit: parsedEnv.data.JSON_BODY_LIMIT,
  urlEncodedBodyLimit: parsedEnv.data.URL_ENCODED_BODY_LIMIT,
  authRateLimitWindowMs: parsedEnv.data.AUTH_RATE_LIMIT_WINDOW_MS,
  authRateLimitMax: parsedEnv.data.AUTH_RATE_LIMIT_MAX,
  uploadFileSizeLimitBytes: parsedEnv.data.UPLOAD_FILE_SIZE_LIMIT_BYTES,
  s3Region: parsedEnv.data.S3_REGION,
  s3Bucket: parsedEnv.data.S3_BUCKET,
  awsAccessKeyId: parsedEnv.data.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: parsedEnv.data.AWS_SECRET_ACCESS_KEY,
  appBaseUrl: parsedEnv.data.APP_BASE_URL
} as const;
