import type { ErrorRequestHandler } from "express";
import multer from "multer";

import { Prisma } from "../generated/prisma/client";

import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { logger } from "../utils/logger";

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        error: {
          message: "A record with one of the provided unique fields already exists.",
          details: error.meta
        }
      });
      return;
    }
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      error: {
        message: "File upload validation failed.",
        details: {
          code: error.code,
          field: error.field
        }
      }
    });
    return;
  }

  logger.error("Unhandled application error.", error);

  res.status(500).json({
    error: {
      message: "Internal server error.",
      details: env.nodeEnv === "development" ? String(error) : undefined
    }
  });
};
