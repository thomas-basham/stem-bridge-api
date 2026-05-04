import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { getSeedAssetBuffer, getSeedAssetContentType } from "./lib/storage/s3";
import { AppError } from "./utils/app-error";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { registerAppRoutes } from "./routes";
import { logger } from "./utils/logger";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.nodeEnv === "production" ? 1 : 0);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.corsOrigins.includes("*") || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new AppError(403, "Origin not allowed by CORS."));
    },
    credentials: true
  })
);
app.use(express.json({ limit: env.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.urlEncodedBodyLimit }));

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

app.get(/^\/seed-assets\/(.+)$/, (req, res, next) => {
  const storageKey = req.path.replace(/^\//, "");
  const seedAsset = getSeedAssetBuffer(storageKey);

  if (!seedAsset) {
    next();
    return;
  }

  res.status(200);
  res.setHeader("Content-Type", getSeedAssetContentType(storageKey));
  res.setHeader("Content-Length", String(seedAsset.length));
  res.send(seedAsset);
});

registerAppRoutes(app);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
