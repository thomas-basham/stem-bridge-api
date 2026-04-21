import path from "node:path";

import { ActivityEventType, Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { sanitizeFileName } from "../../lib/storage/s3";
import { AppError } from "../../utils/app-error";
import type { CreateVersionInput } from "./version.schemas";

const safeUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

const safeCommentAuthorSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.UserSelect;

const fileAssetSelect = {
  id: true,
  name: true,
  originalName: true,
  type: true,
  mimeType: true,
  sizeBytes: true,
  storageKey: true,
  url: true,
  createdAt: true
} satisfies Prisma.FileAssetSelect;

const versionListSelect = {
  id: true,
  projectId: true,
  versionNumber: true,
  notes: true,
  createdAt: true,
  createdBy: {
    select: safeUserSelect
  },
  _count: {
    select: {
      fileAssets: true,
      comments: true
    }
  }
} satisfies Prisma.SongVersionSelect;

const versionDetailSelect = {
  id: true,
  projectId: true,
  versionNumber: true,
  notes: true,
  createdAt: true,
  createdBy: {
    select: safeUserSelect
  },
  fileAssets: {
    orderBy: {
      createdAt: "asc"
    },
    select: fileAssetSelect
  },
  comments: {
    orderBy: [{ timestampSeconds: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      timestampSeconds: true,
      text: true,
      createdAt: true,
      user: {
        select: safeCommentAuthorSelect
      }
    }
  }
} satisfies Prisma.SongVersionSelect;

type SafeUserRecord = {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

const toSafeUser = (user: SafeUserRecord) => {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

const toFileAsset = (fileAsset: {
  id: string;
  name: string;
  originalName: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string;
  createdAt: Date;
}) => {
  return {
    id: fileAsset.id,
    name: fileAsset.name,
    originalName: fileAsset.originalName,
    type: fileAsset.type,
    mimeType: fileAsset.mimeType,
    sizeBytes: fileAsset.sizeBytes,
    storageKey: fileAsset.storageKey,
    url: fileAsset.url,
    createdAt: fileAsset.createdAt
  };
};

const toComment = (comment: {
  id: string;
  timestampSeconds: Prisma.Decimal;
  text: string;
  createdAt: Date;
  user: SafeUserRecord;
}) => {
  return {
    id: comment.id,
    timestampSeconds: comment.timestampSeconds.toNumber(),
    text: comment.text,
    createdAt: comment.createdAt,
    author: toSafeUser(comment.user)
  };
};

const getVersionRecord = async (versionId: string) => {
  const version = await prisma.songVersion.findUnique({
    where: { id: versionId },
    select: versionDetailSelect
  });

  if (!version) {
    throw new AppError(404, "Version not found.");
  }

  return version;
};

const sanitizeArchiveEntryName = (fileName: string) => {
  const baseName = path.basename(fileName).replace(/\0/g, "").trim();
  const withoutSeparators = baseName.replace(/[\\/]/g, "-");
  const normalizedWhitespace = withoutSeparators.replace(/\s+/g, " ");

  if (normalizedWhitespace.length > 0) {
    return normalizedWhitespace;
  }

  return sanitizeFileName(fileName);
};

const buildUniqueArchiveName = (fileName: string, usedNames: Set<string>) => {
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  let candidate = fileName;
  let duplicateIndex = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (${duplicateIndex})${ext}`;
    duplicateIndex += 1;
  }

  usedNames.add(candidate.toLowerCase());

  return candidate;
};

export const createVersion = async (
  projectId: string,
  createdById: string,
  input: CreateVersionInput
) => {
  const version = await prisma.$transaction(
    async (tx) => {
      const latestVersion = await tx.songVersion.findFirst({
        where: {
          projectId
        },
        orderBy: {
          versionNumber: "desc"
        },
        select: {
          versionNumber: true
        }
      });

      const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

      const createdVersion = await tx.songVersion.create({
        data: {
          projectId,
          versionNumber: nextVersionNumber,
          notes: input.notes,
          createdById
        },
        select: {
          id: true
        }
      });

      await tx.activityEvent.create({
        data: {
          projectId,
          type: ActivityEventType.VERSION_CREATED,
          metadata: {
            versionId: createdVersion.id,
            versionNumber: nextVersionNumber,
            createdById
          }
        }
      });

      return createdVersion;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    }
  );

  return getVersionById(version.id);
};

export const listVersionsForProject = async (projectId: string) => {
  const versions = await prisma.songVersion.findMany({
    where: {
      projectId
    },
    orderBy: {
      versionNumber: "desc"
    },
    select: versionListSelect
  });

  return {
    versions: versions.map((version) => ({
      id: version.id,
      projectId: version.projectId,
      versionNumber: version.versionNumber,
      notes: version.notes,
      createdAt: version.createdAt,
      createdBy: toSafeUser(version.createdBy),
      fileAssetCount: version._count.fileAssets,
      commentCount: version._count.comments
    }))
  };
};

export const getVersionById = async (versionId: string) => {
  const version = await getVersionRecord(versionId);

  return {
    version: {
      id: version.id,
      projectId: version.projectId,
      versionNumber: version.versionNumber,
      notes: version.notes,
      createdAt: version.createdAt,
      createdBy: toSafeUser(version.createdBy),
      fileAssets: version.fileAssets.map(toFileAsset),
      comments: version.comments.map(toComment)
    }
  };
};

export const getVersionDownloadBundle = async (versionId: string) => {
  const version = await prisma.songVersion.findUnique({
    where: {
      id: versionId
    },
    select: {
      id: true,
      versionNumber: true,
      project: {
        select: {
          name: true
        }
      },
      fileAssets: {
        orderBy: [{ createdAt: "asc" }, { originalName: "asc" }],
        select: {
          id: true,
          name: true,
          originalName: true,
          storageKey: true
        }
      }
    }
  });

  if (!version) {
    throw new AppError(404, "Version not found.");
  }

  if (version.fileAssets.length === 0) {
    throw new AppError(404, "No files are available for this version.");
  }

  const usedArchiveNames = new Set<string>();
  const zipFileName = `${sanitizeFileName(version.project.name)}-v${version.versionNumber}.zip`;

  return {
    zipFileName,
    files: version.fileAssets.map((file) => {
      const readableName = sanitizeArchiveEntryName(file.originalName || file.name || file.id);

      return {
        id: file.id,
        storageKey: file.storageKey,
        archiveName: buildUniqueArchiveName(readableName, usedArchiveNames)
      };
    })
  };
};
