import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { apiRouter } from "./routes";

const app = express();

app.use(helmet());
app.use(
  cors(
    env.CLIENT_ORIGIN
      ? {
          origin: env.CLIENT_ORIGIN,
          credentials: true
        }
      : undefined
  )
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== "test") {
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
}

app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export { app };

