import { Router } from "express";

import { env } from "../config/env";
import { authRouter } from "../features/auth/auth.routes";
import { projectsRouter } from "../features/projects/projects.routes";
import { projectVersionsRouter, versionsRouter } from "../features/versions/versions.routes";
import { authenticate } from "../middleware/authenticate";

const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "stem-bridge-api",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/projects/:projectId/versions", authenticate, projectVersionsRouter);
apiRouter.use("/projects", authenticate, projectsRouter);
apiRouter.use("/versions", authenticate, versionsRouter);

export { apiRouter };
