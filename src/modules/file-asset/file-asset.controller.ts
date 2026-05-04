import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/app-error";
import { sendSuccess } from "../../utils/response";
import {
  createFileAssetUploadUrl,
  createFileAssetMetadata,
  downloadVersionFile,
  getVersionFileDownloadUrl,
  listFileAssetsForVersion,
  uploadVersionFile
} from "./file-asset.service";
import { isSeedAssetStorageKey } from "../../lib/storage/s3";

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

export const createUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const result = await createFileAssetUploadUrl({
    versionId: req.versionAccess!.versionId,
    projectId: req.versionAccess!.projectId,
    input: req.body
  });

  sendSuccess(res, 201, "File upload URL created successfully", result);
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

  const signedDownload = await getVersionFileDownloadUrl({
    versionId: req.versionAccess!.versionId,
    fileId
  });

  if (!isSeedAssetStorageKey(signedDownload.file.storageKey)) {
    res.redirect(302, signedDownload.download.url);
    return;
  }

  const downloadFile = await downloadVersionFile({
    versionId: req.versionAccess!.versionId,
    fileId
  });

  res.status(200);
  res.setHeader("Content-Type", downloadFile.file.mimeType);
  res.setHeader("Content-Length", String(downloadFile.contentLength ?? downloadFile.file.sizeBytes));
  res.setHeader(
    "Content-Disposition",
    `attachment; filename*=UTF-8''${encodeDownloadFileName(downloadFile.file.originalName)}`
  );

  downloadFile.stream.on("error", (error) => {
    res.destroy(error);
  });

  downloadFile.stream.pipe(res);
});

export const createDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const fileId = req.params.fileId;

  if (typeof fileId !== "string") {
    throw new AppError(400, "File id route parameter is required.");
  }

  const result = await getVersionFileDownloadUrl({
    versionId: req.versionAccess!.versionId,
    fileId
  });

  sendSuccess(res, 200, "File download URL created successfully", result);
});
