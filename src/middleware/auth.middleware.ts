import type { RequestHandler } from "express";

import { AppError } from "../utils/app-error";
import { verifyJwt } from "../utils/jwt";

export const authenticate: RequestHandler = (req, _res, next) => {
  const authorizationHeader = req.header("authorization");

  if (!authorizationHeader) {
    next(new AppError(401, "Missing Authorization header."));
    return;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
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
