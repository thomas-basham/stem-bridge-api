import type { RequestHandler } from "express";

import { AppError } from "../utils/app-error";
import { verifyJwt } from "../utils/jwt";

const bearerTokenPattern = /^Bearer\s+(\S+)$/i;

export const authenticate: RequestHandler = (req, _res, next) => {
  const authorizationHeader = req.header("authorization");

  if (!authorizationHeader) {
    next(new AppError(401, "Missing Authorization header."));
    return;
  }

  const token = authorizationHeader.match(bearerTokenPattern)?.[1];

  if (!token) {
    next(new AppError(401, "Authorization header must use Bearer token format."));
    return;
  }

  try {
    req.auth = verifyJwt(token);
    next();
  } catch {
    next(new AppError(401, "Invalid or expired authentication token."));
  }
};
