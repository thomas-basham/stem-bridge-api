import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required."),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required."),
  JWT_EXPIRES_IN: z.string().min(1, "JWT_EXPIRES_IN is required."),
  S3_REGION: z.string().min(1, "S3_REGION is required."),
  S3_BUCKET: z.string().min(1, "S3_BUCKET is required."),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required."),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required."),
  APP_BASE_URL: z.string().url("APP_BASE_URL must be a valid URL.")
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
  jwtSecret: parsedEnv.data.JWT_SECRET,
  jwtExpiresIn: parsedEnv.data.JWT_EXPIRES_IN,
  s3Region: parsedEnv.data.S3_REGION,
  s3Bucket: parsedEnv.data.S3_BUCKET,
  awsAccessKeyId: parsedEnv.data.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: parsedEnv.data.AWS_SECRET_ACCESS_KEY,
  appBaseUrl: parsedEnv.data.APP_BASE_URL
} as const;
