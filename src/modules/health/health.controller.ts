import type { Request, Response } from "express";

import { env } from "../../config/env";
import { sendSuccess } from "../../utils/response";

export const getHealth = (_req: Request, res: Response) => {
  sendSuccess(res, 200, "Health check retrieved successfully", {
    status: "ok",
    service: "stembridge-api",
    environment: env.nodeEnv,
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString()
  });
};
