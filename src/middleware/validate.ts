import type { RequestHandler } from "express";
import { ZodError, type ZodTypeAny } from "zod";

import { ApiError } from "../lib/errors/api-error";

type ValidationSchemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

export const validate = (schemas: ValidationSchemas): RequestHandler => {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body) as never;
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as never;
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as never;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ApiError(400, "Request validation failed.", error.flatten()));
        return;
      }

      next(error);
    }
  };
};
