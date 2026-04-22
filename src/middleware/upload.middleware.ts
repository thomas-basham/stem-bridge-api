import multer from "multer";

import { env } from "../config/env";

export const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: env.uploadFileSizeLimitBytes
  }
});
