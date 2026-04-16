import type { Request, Response } from "express";

import { asyncHandler } from "../../lib/http/async-handler";
import {
  acceptInvitation,
  createProject,
  getProjectById,
  inviteCollaborator,
  listProjectsForUser
} from "./projects.service";

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const result = await listProjectsForUser(req.user!.sub);
  res.status(200).json(result);
});

export const createProjectHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await createProject(req.user!.sub, req.body);
  res.status(201).json(result);
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const result = await getProjectById(req.user!.sub, req.params.projectId);
  res.status(200).json(result);
});

export const inviteProjectCollaborator = asyncHandler(async (req: Request, res: Response) => {
  const result = await inviteCollaborator(req.user!.sub, req.params.projectId, req.body);
  res.status(201).json(result);
});

export const acceptProjectInvitation = asyncHandler(async (req: Request, res: Response) => {
  const result = await acceptInvitation(req.user!.sub, req.user!.email, req.params.token);
  res.status(200).json(result);
});

