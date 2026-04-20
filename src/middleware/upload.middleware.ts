import multer from "multer";

export const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: 100 * 1024 * 1024
  }
});
