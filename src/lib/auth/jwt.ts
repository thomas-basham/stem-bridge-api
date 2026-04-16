import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../../config/env";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  displayName: string;
  iat?: number;
  exp?: number;
};

export const signAccessToken = (payload: Omit<AccessTokenPayload, "iat" | "exp">) => {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"]
  });
};

export const verifyAccessToken = (token: string) => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (typeof payload === "string") {
    throw new Error("Invalid token payload.");
  }

  return payload as AccessTokenPayload;
};

export const generateOpaqueToken = () => {
  return crypto.randomBytes(48).toString("hex");
};

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

