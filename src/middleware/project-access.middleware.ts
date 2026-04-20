import type { Request } from "express";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

export type ProjectAccessContext = {
  projectId: string;
  ownerId: string;
  membershipId: string;
  isOwner: boolean;
};

const getProjectIdFromRequest = (req: Request) => {
  const projectId = req.params.projectId;

  if (typeof projectId !== "string" || projectId.length === 0) {
    throw new AppError(400, "Project id route parameter is required.");
  }

  return projectId;
};

const resolveProjectAccess = async (req: Request): Promise<ProjectAccessContext> => {
  const authenticatedUserId = req.auth?.sub;

  if (!authenticatedUserId) {
    throw new AppError(401, "Authentication is required.");
  }

  const projectId = getProjectIdFromRequest(req);

  if (req.projectAccess?.projectId === projectId) {
    return req.projectAccess;
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: authenticatedUserId
      }
    },
    select: {
      id: true,
      project: {
        select: {
          id: true,
          ownerId: true
        }
      }
    }
  });

  if (!membership) {
    throw new AppError(404, "Project not found.");
  }

  const projectAccess = {
    projectId: membership.project.id,
    ownerId: membership.project.ownerId,
    membershipId: membership.id,
    isOwner: membership.project.ownerId === authenticatedUserId
  };

  req.projectAccess = projectAccess;

  return projectAccess;
};

export const ensureProjectMember = asyncHandler(async (req, _res, next) => {
  await resolveProjectAccess(req);
  next();
});

export const ensureProjectOwner = asyncHandler(async (req, _res, next) => {
  const projectAccess = await resolveProjectAccess(req);

  if (!projectAccess.isOwner) {
    throw new AppError(403, "Only the project owner can perform this action.");
  }

  next();
});
