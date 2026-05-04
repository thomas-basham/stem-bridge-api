import serverless from "serverless-http";

import { app } from "./app";

export const handler = serverless(app, {
  binary: ["audio/*", "application/octet-stream", "application/pdf", "application/zip"]
});
