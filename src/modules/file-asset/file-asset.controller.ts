import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/app-error";
import {
  createFileAssetMetadata,
  listFileAssetsForVersion,
  uploadVersionFile
} from "./file-asset.service";

export const createMetadata = asyncHandler(async (req: Request, res: Response) => {
  const result = await createFileAssetMetadata(
    req.versionAccess!.versionId,
    req.versionAccess!.projectId,
    req.body
  );
  res.status(201).json(result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listFileAssetsForVersion(req.versionAccess!.versionId);
  res.status(200).json(result);
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

  res.status(201).json(result);
});
