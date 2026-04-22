import rateLimit from "express-rate-limit";

import { env } from "../config/env";
import { buildErrorResponse } from "../utils/response";

export const authRateLimiter = rateLimit({
  windowMs: env.authRateLimitWindowMs,
  limit: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (_req, res) => {
    res.status(429).json(
      buildErrorResponse("Too many authentication requests.", {
        windowMs: env.authRateLimitWindowMs,
        maxRequests: env.authRateLimitMax
      })
    );
  }
});
