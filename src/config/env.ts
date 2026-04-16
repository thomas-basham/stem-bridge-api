import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters."),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  INVITATION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CLIENT_ORIGIN: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  S3_REGION: z.string().min(1, "S3_REGION is required."),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required."),
  AWS_ACCESS_KEY_ID: z.preprocess(emptyStringToUndefined, z.string().optional()),
  AWS_SECRET_ACCESS_KEY: z.preprocess(emptyStringToUndefined, z.string().optional()),
  AWS_SESSION_TOKEN: z.preprocess(emptyStringToUndefined, z.string().optional()),
  AWS_S3_ENDPOINT: z.preprocess(emptyStringToUndefined, z.string().url().optional()),
  AWS_S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Environment validation failed.", parsedEnv.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration.");
}

export const env = parsedEnv.data;

