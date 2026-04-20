import type { Response } from "express";

type SuccessResponse<T> = {
  message: string;
  data: T;
};

type ErrorResponse = {
  message: string;
  details?: unknown;
};

export const buildSuccessResponse = <T>(message: string, data: T): SuccessResponse<T> => {
  return {
    message,
    data
  };
};

export const sendSuccess = <T>(res: Response, statusCode: number, message: string, data: T) => {
  return res.status(statusCode).json(buildSuccessResponse(message, data));
};

export const buildErrorResponse = (message: string, details?: unknown): ErrorResponse => {
  if (details === undefined) {
    return { message };
  }

  return {
    message,
    details
  };
};
