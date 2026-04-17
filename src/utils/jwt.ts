import jwt from "jsonwebtoken";

import { env } from "../config/env";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
};

export const signJwt = (payload: Omit<AuthTokenPayload, "iat" | "exp">) => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"]
  });
};

export const verifyJwt = (token: string) => {
  const decoded = jwt.verify(token, env.jwtSecret);

  if (typeof decoded === "string") {
    throw new Error("Unexpected JWT payload.");
  }

  return decoded as AuthTokenPayload;
};
