import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

import { AppError } from "../utils/app-error";

type ValidationSource = "body" | "params" | "query";

type ValidationSchemas = Partial<Record<ValidationSource, ZodTypeAny>>;

type ValidationIssue = {
  source: ValidationSource;
  path: string;
  message: string;
  code: string;
};

const validationSources: ValidationSource[] = ["body", "params", "query"];

const formatIssues = (
  source: ValidationSource,
  schemaResult: ReturnType<ZodTypeAny["safeParse"]>
): ValidationIssue[] => {
  if (schemaResult.success) {
    return [];
  }

  return schemaResult.error.issues.map((issue) => ({
    source,
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code
  }));
};

const buildValidationError = (issues: ValidationIssue[]) => {
  return new AppError(400, "Request validation failed.", { issues });
};

export const validateRequest = (schemas: ValidationSchemas): RequestHandler => {
  return (req, _res, next) => {
    const collectedIssues: ValidationIssue[] = [];
    const parsedValues: Partial<Record<ValidationSource, unknown>> = {};

    for (const source of validationSources) {
      const schema = schemas[source];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[source]);
      collectedIssues.push(...formatIssues(source, result));

      if (result.success) {
        parsedValues[source] = result.data;
      }
    }

    if (collectedIssues.length > 0) {
      next(buildValidationError(collectedIssues));
      return;
    }

    if (parsedValues.body !== undefined) {
      req.body = parsedValues.body;
    }

    if (parsedValues.params !== undefined) {
      req.params = parsedValues.params as typeof req.params;
    }

    if (parsedValues.query !== undefined) {
      Object.defineProperty(req, "query", {
        value: parsedValues.query,
        configurable: true,
        enumerable: true,
        writable: true
      });
    }

    next();
  };
};

export const validateBody = (schema: ZodTypeAny) => {
  return validateRequest({ body: schema });
};

export const validateParams = (schema: ZodTypeAny) => {
  return validateRequest({ params: schema });
};

export const validateQuery = (schema: ZodTypeAny) => {
  return validateRequest({ query: schema });
};
