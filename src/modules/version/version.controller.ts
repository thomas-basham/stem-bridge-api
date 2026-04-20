import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { createVersion, getVersionById, listVersionsForProject } from "./version.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await createVersion(req.projectAccess!.projectId, req.auth!.sub, req.body);
  sendSuccess(res, 201, "Version created successfully", result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await listVersionsForProject(req.projectAccess!.projectId);
  sendSuccess(res, 200, "Versions retrieved successfully", result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await getVersionById(req.versionAccess!.versionId);
  sendSuccess(res, 200, "Version retrieved successfully", result);
});
