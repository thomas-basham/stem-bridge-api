import type { Request } from "express";

import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";

export type VersionAccessContext = {
  versionId: string;
  projectId: string;
  createdById: string;
  versionNumber: number;
};

const getVersionIdFromRequest = (req: Request) => {
  const versionId = req.params.versionId;

  if (typeof versionId !== "string" || versionId.length === 0) {
    throw new AppError(400, "Version id route parameter is required.");
  }

  return versionId;
};

const resolveVersionAccess = async (req: Request): Promise<VersionAccessContext> => {
  const authenticatedUserId = req.auth?.sub;

  if (!authenticatedUserId) {
    throw new AppError(401, "Authentication is required.");
  }

  const versionId = getVersionIdFromRequest(req);

  if (req.versionAccess?.versionId === versionId) {
    return req.versionAccess;
  }

  const version = await prisma.songVersion.findFirst({
    where: {
      id: versionId,
      project: {
        members: {
          some: {
            userId: authenticatedUserId
          }
        }
      }
    },
    select: {
      id: true,
      projectId: true,
      createdById: true,
      versionNumber: true
    }
  });

  if (!version) {
    throw new AppError(404, "Version not found.");
  }

  const versionAccess = {
    versionId: version.id,
    projectId: version.projectId,
    createdById: version.createdById,
    versionNumber: version.versionNumber
  };

  req.versionAccess = versionAccess;

  return versionAccess;
};

export const ensureVersionMember = asyncHandler(async (req, _res, next) => {
  await resolveVersionAccess(req);
  next();
});
