import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { createFileAssetMetadata, listFileAssetsForVersion } from "./file-asset.service";

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
