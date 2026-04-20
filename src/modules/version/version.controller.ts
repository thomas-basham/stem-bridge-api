import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { createVersion, getVersionById, listVersionsForProject } from "./version.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await createVersion(req.projectAccess!.projectId, req.auth!.sub, req.body);
  res.status(201).json(result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listVersionsForProject(req.projectAccess!.projectId);
  res.status(200).json(result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await getVersionById(req.versionAccess!.versionId);
  res.status(200).json(result);
});
