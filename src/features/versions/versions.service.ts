import crypto from "node:crypto";

import { ProjectRole, VersionFileUploadStatus } from "@prisma/client";

import { prisma } from "../../database/prisma";
import { ApiError } from "../../lib/errors/api-error";
import {
  buildVersionFileStorageKey,
  createSignedUploadUrl,
  sanitizeFileName
} from "../../lib/storage/s3";
import type { CreateVersionCommentInput, CreateVersionInput } from "./versions.schemas";

const publicUserSelect = {
  id: true,
  email: true,
  displayName: true
} as const;

const roleRank: Record<ProjectRole, number> = {
  [ProjectRole.VIEWER]: 1,
  [ProjectRole.EDITOR]: 2,
  [ProjectRole.OWNER]: 3
};

const serializeUser = (user: { id: string; email: string; displayName: string }) => {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName
  };
};

const serializeVersionFile = (file: {
  id: string;
  kind: string;
  position: number;
  fileName: string;
  originalFileName: string;
  contentType: string;
  sizeBytes: number;
  uploadStatus: VersionFileUploadStatus;
  uploadedAt: Date | null;
  createdAt: Date;
}) => {
  return {
    id: file.id,
    kind: file.kind,
    position: file.position,
    fileName: file.fileName,
    originalFileName: file.originalFileName,
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    uploadStatus: file.uploadStatus,
    uploadedAt: file.uploadedAt,
    createdAt: file.createdAt
  };
};

const serializeVersionComment = (comment: {
  id: string;
  body: string;
  timestampMs: number | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; email: string; displayName: string };
}) => {
  return {
    id: comment.id,
    body: comment.body,
    timestampMs: comment.timestampMs,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: serializeUser(comment.author)
  };
};

const ensureProjectRole = async (
  userId: string,
  projectId: string,
  minimumRole: ProjectRole = ProjectRole.VIEWER
) => {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId
      }
    }
  });

  if (!membership) {
    throw new ApiError(404, "Project not found.");
  }

  if (roleRank[membership.role] < roleRank[minimumRole]) {
    throw new ApiError(403, "You do not have permission to perform this action.");
  }

  return membership;
};

const getVersionRecord = async (userId: string, versionId: string) => {
  const version = await prisma.version.findFirst({
    where: {
      id: versionId,
      project: {
        members: {
          some: {
            userId
          }
        }
      }
    },
    include: {
      project: {
        select: {
          id: true,
          name: true
        }
      },
      createdBy: {
        select: publicUserSelect
      },
      files: {
        orderBy: {
          position: "asc"
        }
      },
      comments: {
        include: {
          author: {
            select: publicUserSelect
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

  if (!version) {
    throw new ApiError(404, "Version not found.");
  }

  return version;
};

export const listVersionsForProject = async (userId: string, projectId: string) => {
  await ensureProjectRole(userId, projectId);

  const versions = await prisma.version.findMany({
    where: { projectId },
    include: {
      createdBy: {
        select: publicUserSelect
      },
      files: {
        orderBy: {
          position: "asc"
        }
      },
      _count: {
        select: {
          comments: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return {
    versions: versions.map((version) => ({
      id: version.id,
      projectId: version.projectId,
      label: version.label,
      notes: version.notes,
      sourceDaw: version.sourceDaw,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
      createdBy: serializeUser(version.createdBy),
      fileCount: version.files.length,
      completedFileCount: version.files.filter(
        (file) => file.uploadStatus === VersionFileUploadStatus.UPLOADED
      ).length,
      commentCount: version._count.comments,
      files: version.files.map(serializeVersionFile)
    }))
  };
};

export const createVersion = async (
  userId: string,
  projectId: string,
  input: CreateVersionInput
) => {
  await ensureProjectRole(userId, projectId, ProjectRole.EDITOR);

  const created = await prisma.$transaction(async (tx) => {
    const version = await tx.version.create({
      data: {
        projectId,
        createdById: userId,
        label: input.label.trim(),
        notes: input.notes,
        sourceDaw: input.sourceDaw
      }
    });

    const files = await Promise.all(
      input.files.map((file, index) => {
        const fileId = crypto.randomUUID();

        return tx.versionFile.create({
          data: {
            id: fileId,
            versionId: version.id,
            uploadedById: userId,
            kind: file.kind,
            position: index,
            fileName: sanitizeFileName(file.fileName),
            originalFileName: file.fileName,
            storageKey: buildVersionFileStorageKey(projectId, version.id, fileId, file.fileName),
            contentType: file.contentType,
            sizeBytes: file.sizeBytes
          }
        });
      })
    );

    return {
      versionId: version.id,
      files
    };
  });

  const uploads = await Promise.all(
    created.files.map(async (file) => ({
      fileId: file.id,
      fileName: file.fileName,
      originalFileName: file.originalFileName,
      kind: file.kind,
      method: "PUT",
      contentType: file.contentType,
      uploadUrl: await createSignedUploadUrl(file.storageKey, file.contentType)
    }))
  );

  const version = await getVersionById(userId, created.versionId);

  return {
    ...version,
    uploads
  };
};

export const getVersionById = async (userId: string, versionId: string) => {
  const version = await getVersionRecord(userId, versionId);

  return {
    version: {
      id: version.id,
      project: version.project,
      label: version.label,
      notes: version.notes,
      sourceDaw: version.sourceDaw,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
      createdBy: serializeUser(version.createdBy),
      files: version.files.map(serializeVersionFile),
      comments: version.comments.map(serializeVersionComment)
    }
  };
};

export const markFileUploadComplete = async (
  userId: string,
  versionId: string,
  fileId: string
) => {
  const version = await prisma.version.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      projectId: true
    }
  });

  if (!version) {
    throw new ApiError(404, "Version not found.");
  }

  await ensureProjectRole(userId, version.projectId, ProjectRole.EDITOR);

  const versionFile = await prisma.versionFile.findFirst({
    where: {
      id: fileId,
      versionId
    }
  });

  if (!versionFile) {
    throw new ApiError(404, "Version file not found.");
  }

  const updatedFile = await prisma.versionFile.update({
    where: { id: versionFile.id },
    data: {
      uploadStatus: VersionFileUploadStatus.UPLOADED,
      uploadedAt: new Date()
    }
  });

  return {
    file: serializeVersionFile(updatedFile)
  };
};

export const listComments = async (userId: string, versionId: string) => {
  const version = await getVersionRecord(userId, versionId);

  return {
    comments: version.comments.map(serializeVersionComment)
  };
};

export const createComment = async (
  userId: string,
  versionId: string,
  input: CreateVersionCommentInput
) => {
  const version = await prisma.version.findUnique({
    where: { id: versionId },
    select: {
      id: true,
      projectId: true
    }
  });

  if (!version) {
    throw new ApiError(404, "Version not found.");
  }

  await ensureProjectRole(userId, version.projectId);

  const comment = await prisma.versionComment.create({
    data: {
      versionId,
      authorId: userId,
      body: input.body.trim(),
      timestampMs: input.timestampMs
    },
    include: {
      author: {
        select: publicUserSelect
      }
    }
  });

  return {
    comment: serializeVersionComment(comment)
  };
};

export const getVersionDownloadBundle = async (userId: string, versionId: string) => {
  const version = await prisma.version.findFirst({
    where: {
      id: versionId,
      project: {
        members: {
          some: {
            userId
          }
        }
      }
    },
    include: {
      project: {
        select: {
          id: true,
          name: true
        }
      },
      files: {
        where: {
          uploadStatus: VersionFileUploadStatus.UPLOADED
        },
        orderBy: {
          position: "asc"
        }
      }
    }
  });

  if (!version) {
    throw new ApiError(404, "Version not found.");
  }

  if (version.files.length === 0) {
    throw new ApiError(400, "This version has no completed files available for download.");
  }

  return {
    zipFileName: `${sanitizeFileName(`${version.project.name}-${version.label}`)}.zip`,
    files: version.files
  };
};
