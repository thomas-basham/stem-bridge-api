import type { RequestHandler } from "express";
import type { AnyZodObject, ZodError } from "zod";

import { AppError } from "../utils/app-error";

type ValidationSchemas = {
  body?: AnyZodObject;
  params?: AnyZodObject;
  query?: AnyZodObject;
};

const buildValidationError = (error: ZodError) => {
  return new AppError(400, "Request validation failed.", error.flatten());
};

export const validate = (schemas: ValidationSchemas): RequestHandler => {
  return (req, _res, next) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      next();
    } catch (error) {
      next(buildValidationError(error as ZodError));
    }
  };
};
