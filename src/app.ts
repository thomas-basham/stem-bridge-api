import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { authRouter } from "./modules/auth/auth.routes";
import { commentRouter, versionCommentRouter } from "./modules/comment/comment.routes";
import { versionFileAssetRouter } from "./modules/file-asset/file-asset.routes";
import { healthRouter } from "./modules/health/health.routes";
import { inviteRouter, projectInviteRouter } from "./modules/invite/invite.routes";
import { projectRouter } from "./modules/project/project.routes";
import { projectVersionRouter, versionRouter } from "./modules/version/version.routes";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { logger } from "./utils/logger";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.nodeEnv === "production" ? 1 : 0);

app.use(helmet());
app.use(
  cors({
    origin: env.appBaseUrl,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== "test") {
  app.use(
    morgan(env.nodeEnv === "production" ? "combined" : "dev", {
      stream: {
        write: (message) => {
          logger.http(message.trim());
        }
      }
    })
  );
}

app.use("/auth", authRouter);
app.use("/comments", commentRouter);
app.use("/health", healthRouter);
app.use("/invites", inviteRouter);
app.use("/projects/:projectId/invites", projectInviteRouter);
app.use("/projects/:projectId/versions", projectVersionRouter);
app.use("/projects", projectRouter);
app.use("/versions/:versionId/comments", versionCommentRouter);
app.use("/versions/:versionId/files", versionFileAssetRouter);
app.use("/versions", versionRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
