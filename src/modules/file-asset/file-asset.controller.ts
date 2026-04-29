import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/app-error";
import { sendSuccess } from "../../utils/response";
import {
  createFileAssetMetadata,
  downloadVersionFile,
  listFileAssetsForVersion,
  uploadVersionFile
} from "./file-asset.service";

export const createMetadata = asyncHandler(async (req: Request, res: Response) => {
  const result = await createFileAssetMetadata(
    req.versionAccess!.versionId,
    req.versionAccess!.projectId,
    req.body
  );
  sendSuccess(res, 201, "File metadata created successfully", result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listFileAssetsForVersion(req.versionAccess!.versionId);
  sendSuccess(res, 200, "Files retrieved successfully", result);
});

export const upload = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError(400, "A file upload is required in the `file` form field.");
  }

  const result = await uploadVersionFile({
    versionId: req.versionAccess!.versionId,
    projectId: req.versionAccess!.projectId,
    file: req.file,
    input: req.body
  });

  sendSuccess(res, 201, "File uploaded successfully", result);
});

const encodeDownloadFileName = (fileName: string) => {
  return encodeURIComponent(fileName)
    .replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, "%2A");
};

export const download = asyncHandler(async (req: Request, res: Response) => {
  const fileId = req.params.fileId;

  if (typeof fileId !== "string") {
    throw new AppError(400, "File id route parameter is required.");
  }

  const downloadFile = await downloadVersionFile({
    versionId: req.versionAccess!.versionId,
    fileId
  });

  res.status(200);
  res.setHeader("Content-Type", downloadFile.file.mimeType);
  res.setHeader("Content-Length", String(downloadFile.file.sizeBytes));
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeDownloadFileName(downloadFile.file.originalName)}`
  );

  downloadFile.stream.on("error", (error) => {
    res.destroy(error);
  });

  downloadFile.stream.pipe(res);
});
