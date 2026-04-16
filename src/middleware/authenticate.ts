import type { RequestHandler } from "express";

import { verifyAccessToken } from "../lib/auth/jwt";
import { ApiError } from "../lib/errors/api-error";

export const authenticate: RequestHandler = (req, _res, next) => {
  const authorization = req.header("authorization");

  if (!authorization) {
    next(new ApiError(401, "Missing Authorization header."));
    return;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(new ApiError(401, "Authorization header must use the Bearer scheme."));
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired access token."));
  }
};

