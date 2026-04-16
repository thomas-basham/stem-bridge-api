import dotenv from "dotenv";

dotenv.config();

const allowedNodeEnvs = ["development", "test", "production"] as const;

const parseNodeEnv = (value: string | undefined) => {
  if (!value) {
    return "development";
  }

  if (allowedNodeEnvs.includes(value as (typeof allowedNodeEnvs)[number])) {
    return value as (typeof allowedNodeEnvs)[number];
  }

  throw new Error(`Invalid NODE_ENV value: ${value}`);
};

const parsePort = (value: string | undefined) => {
  if (!value) {
    return 4000;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
};

const parseRequiredString = (value: string | undefined, key: string) => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
};

export const env = {
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  port: parsePort(process.env.PORT),
  databaseUrl: parseRequiredString(process.env.DATABASE_URL, "DATABASE_URL"),
  clientOrigin: process.env.CLIENT_ORIGIN || "*"
} as const;
