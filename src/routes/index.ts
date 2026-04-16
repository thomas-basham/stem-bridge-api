import { Router } from "express";

import { env } from "../config/env";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "stem-bridge-api",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

export { apiRouter };
