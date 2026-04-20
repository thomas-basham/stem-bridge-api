import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler";
import { createProject, getProjectById, getProjectsForUser } from "./project.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const result = await createProject(req.auth!.sub, req.body);
  res.status(201).json(result);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await getProjectsForUser(req.auth!.sub);
  res.status(200).json(result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const result = await getProjectById(req.projectAccess!.projectId);
  res.status(200).json(result);
});
