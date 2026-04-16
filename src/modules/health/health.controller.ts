import type { Request, Response } from "express";

import { env } from "../../config/env";

export const getHealth = (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "stembridge-api",
    environment: env.nodeEnv,
    uptimeSeconds: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString()
  });
};
