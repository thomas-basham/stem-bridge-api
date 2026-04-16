import type { RequestHandler } from "express";

import { AppError } from "../utils/app-error";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
