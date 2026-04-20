import type { ErrorRequestHandler } from "express";
import multer from "multer";

import { Prisma } from "../generated/prisma/client";

import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";
import { buildErrorResponse } from "../utils/response";

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json(buildErrorResponse(error.message, error.details));
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res
        .status(409)
        .json(
          buildErrorResponse(
            "A record with one of the provided unique fields already exists.",
            error.meta
          )
        );
      return;
    }
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json(
      buildErrorResponse("File upload validation failed.", {
        code: error.code,
        field: error.field
      })
    );
    return;
  }

  logger.error("Unhandled application error.", error);

  res
    .status(500)
    .json(
      buildErrorResponse(
        "Internal server error.",
        env.nodeEnv === "development" ? String(error) : undefined
      )
    );
};
