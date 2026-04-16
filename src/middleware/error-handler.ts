import type { ErrorRequestHandler } from "express";

import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

import { env } from "../config/env";
import { ApiError } from "../lib/errors/api-error";

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        message: error.message,
        details: error.details
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        message: "Request validation failed.",
        details: error.flatten()
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

  console.error(error);

  res.status(500).json({
    error: {
      message: "Internal server error.",
      details: env.NODE_ENV === "development" ? String(error) : undefined
    }
  });
};

