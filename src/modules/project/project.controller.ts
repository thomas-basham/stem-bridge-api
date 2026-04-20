import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { sendSuccess } from "../../utils/response";
import { createProject, getProjectById, getProjectsForUser } from "./project.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await createProject(req.auth!.sub, req.body);
  sendSuccess(res, 201, "Project created successfully", result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await getProjectsForUser(req.auth!.sub);
  sendSuccess(res, 200, "Projects retrieved successfully", result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await getProjectById(req.projectAccess!.projectId);
  sendSuccess(res, 200, "Project retrieved successfully", result);
});
