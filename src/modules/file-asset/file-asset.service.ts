import type { Prisma } from "../../generated/prisma/client";
import { ActivityEventType } from "../../generated/prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import {
  buildVersionFileStorageKey,
  buildVersionFileStoragePrefix,
  deleteFileObject,
  encodeObjectKeyForUrl,
  getFileStream,
  getSeedAssetBuffer,
  getSeedAssetSizeBytes,
  getPublicFileUrl,
  getSignedFileUrl,
  getSignedUploadUrl,
  isSeedAssetStorageKey,
  sanitizeFileName,
  uploadFileBuffer
} from "../../lib/storage/s3";
import { AppError } from "../../utils/app-error";
import type {
  CreateFileAssetMetadataInput,
  CreateFileAssetUploadUrlInput,
  UploadFileAssetInput
} from "./file-asset.schemas";

const PRESIGNED_URL_EXPIRES_IN_SECONDS = 900;

const fileAssetSelect = {
  id: true,
  songVersionId: true,
  name: true,
  originalName: true,
  type: true,
  mimeType: true,
  sizeBytes: true,
  storageKey: true,
  url: true,
  createdAt: true
} satisfies Prisma.FileAssetSelect;

const toFileAsset = (fileAsset: {
  id: string;
  songVersionId: string;
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
    versionId: fileAsset.songVersionId,
    name: fileAsset.name,
    originalName: fileAsset.originalName,
    type: fileAsset.type,
    mimeType: fileAsset.mimeType,
    sizeBytes: getSeedAssetSizeBytes(fileAsset.storageKey) ?? fileAsset.sizeBytes,
    storageKey: fileAsset.storageKey,
    url: fileAsset.url,
    createdAt: fileAsset.createdAt
  };
};

const normalizeMetadataInput = (
  versionId: string,
  projectId: string,
  input: CreateFileAssetMetadataInput
): CreateFileAssetMetadataInput => {
  const storageKey = input.storageKey.trim();
  const expectedStoragePrefix = buildVersionFileStoragePrefix(projectId, versionId);

  if (!storageKey.startsWith(expectedStoragePrefix)) {
    throw new AppError(400, "File storage key does not belong to this project version.");
  }

  const expectedUrl = getPublicFileUrl(storageKey);

  if (input.url.trim() !== expectedUrl) {
    throw new AppError(400, "File URL does not match the expected storage URL.");
  }

  if (input.sizeBytes > env.uploadFileSizeLimitBytes) {
    throw new AppError(413, "File metadata exceeds the configured upload size limit.", {
      maxFileSizeBytes: env.uploadFileSizeLimitBytes
    });
  }

  return {
    name: sanitizeFileName(input.name),
    originalName: input.originalName.trim(),
    type: input.type,
    mimeType: input.mimeType.trim(),
    sizeBytes: input.sizeBytes,
    storageKey,
    url: expectedUrl
  };
};

const createFileAssetRecord = async (
  versionId: string,
  projectId: string,
  input: CreateFileAssetMetadataInput
) => {
  const fileAsset = await prisma.$transaction(async (tx) => {
    const createdFileAsset = await tx.fileAsset.create({
      data: {
        songVersionId: versionId,
        name: input.name.trim(),
        originalName: input.originalName.trim(),
        type: input.type,
        mimeType: input.mimeType.trim(),
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey.trim(),
        url: input.url.trim()
      },
      select: fileAssetSelect
    });

    await tx.activityEvent.create({
      data: {
        projectId,
        type: ActivityEventType.FILE_UPLOADED,
        metadata: {
          versionId,
          fileAssetId: createdFileAsset.id,
          type: createdFileAsset.type,
          name: createdFileAsset.name,
          storageKey: createdFileAsset.storageKey
        }
      }
    });

    return createdFileAsset;
  });

  return {
    file: toFileAsset(fileAsset)
  };
};

export const createFileAssetMetadata = async (
  versionId: string,
  projectId: string,
  input: CreateFileAssetMetadataInput
) => {
  return createFileAssetRecord(
    versionId,
    projectId,
    normalizeMetadataInput(versionId, projectId, input)
  );
};

export const createFileAssetUploadUrl = async (params: {
  versionId: string;
  projectId: string;
  input: CreateFileAssetUploadUrlInput;
}) => {
  if (params.input.sizeBytes > env.uploadFileSizeLimitBytes) {
    throw new AppError(413, "File exceeds the configured upload size limit.", {
      maxFileSizeBytes: env.uploadFileSizeLimitBytes
    });
  }

  const originalName = params.input.originalName.trim();
  const mimeType = params.input.mimeType.trim();
  const storageKey = buildVersionFileStorageKey(params.projectId, params.versionId, originalName);
  const safeName = sanitizeFileName(originalName);
  const fileUrl = getPublicFileUrl(storageKey);

  try {
    const signedUploadUrl = await getSignedUploadUrl({
      storageKey,
      contentType: mimeType,
      expiresInSeconds: PRESIGNED_URL_EXPIRES_IN_SECONDS
    });

    return {
      upload: {
        url: signedUploadUrl,
        method: "PUT" as const,
        headers: {
          "Content-Type": mimeType
        },
        expiresInSeconds: PRESIGNED_URL_EXPIRES_IN_SECONDS
      },
      metadata: {
        name: safeName,
        originalName,
        type: params.input.type,
        mimeType,
        sizeBytes: params.input.sizeBytes,
        storageKey,
        url: fileUrl
      }
    };
  } catch (error) {
    throw new AppError(502, "Failed to create upload URL.", {
      reason: error instanceof Error ? error.message : "Unknown storage error"
    });
  }
};

export const uploadVersionFile = async (params: {
  versionId: string;
  projectId: string;
  file: Express.Multer.File;
  input: UploadFileAssetInput;
}) => {
  if (!params.file.buffer || params.file.size === 0) {
    throw new AppError(400, "Uploaded file is empty.");
  }

  const storageKey = buildVersionFileStorageKey(
    params.projectId,
    params.versionId,
    params.file.originalname
  );
  const safeName = sanitizeFileName(params.file.originalname);
  const fileUrl = getPublicFileUrl(storageKey);

  try {
    await uploadFileBuffer({
      buffer: params.file.buffer,
      storageKey,
      contentType: params.file.mimetype || "application/octet-stream"
    });
  } catch (error) {
    throw new AppError(502, "Failed to upload file to storage.", {
      reason: error instanceof Error ? error.message : "Unknown storage error"
    });
  }

  try {
    return await createFileAssetRecord(params.versionId, params.projectId, {
      name: safeName,
      originalName: params.file.originalname,
      type: params.input.type,
      mimeType: params.file.mimetype || "application/octet-stream",
      sizeBytes: params.file.size,
      storageKey,
      url: fileUrl
    });
  } catch (error) {
    try {
      await deleteFileObject(storageKey);
    } catch {
      // Ignore cleanup failures and surface the original database error instead.
    }

    throw error;
  }
};

export const listFileAssetsForVersion = async (versionId: string) => {
  const fileAssets = await prisma.fileAsset.findMany({
    where: {
      songVersionId: versionId
    },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    select: fileAssetSelect
  });

  return {
    files: fileAssets.map(toFileAsset)
  };
};

const findFileAssetForVersion = async (params: { versionId: string; fileId: string }) => {
  const fileAsset = await prisma.fileAsset.findFirst({
    where: {
      id: params.fileId,
      songVersionId: params.versionId
    },
    select: fileAssetSelect
  });

  if (!fileAsset) {
    throw new AppError(404, "File not found.");
  }

  return fileAsset;
};

const getSeedAssetUrl = (storageKey: string) => {
  return `${env.appBaseUrl.replace(/\/$/, "")}/${encodeObjectKeyForUrl(storageKey)}`;
};

export const getVersionFileDownloadUrl = async (params: {
  versionId: string;
  fileId: string;
}) => {
  const fileAsset = await findFileAssetForVersion(params);

  try {
    const downloadUrl = isSeedAssetStorageKey(fileAsset.storageKey)
      ? getSeedAssetUrl(fileAsset.storageKey)
      : await getSignedFileUrl(fileAsset.storageKey, PRESIGNED_URL_EXPIRES_IN_SECONDS);

    return {
      file: toFileAsset(fileAsset),
      download: {
        url: downloadUrl,
        method: "GET" as const,
        expiresInSeconds: isSeedAssetStorageKey(fileAsset.storageKey)
          ? null
          : PRESIGNED_URL_EXPIRES_IN_SECONDS
      }
    };
  } catch (error) {
    throw new AppError(502, "Failed to create download URL.", {
      reason: error instanceof Error ? error.message : "Unknown storage error"
    });
  }
};

export const downloadVersionFile = async (params: {
  versionId: string;
  fileId: string;
}) => {
  const fileAsset = await findFileAssetForVersion(params);

  try {
    const seedAssetBuffer = getSeedAssetBuffer(fileAsset.storageKey);
    const stream = await getFileStream(fileAsset.storageKey);

    return {
      file: toFileAsset(fileAsset),
      contentLength: seedAssetBuffer?.length,
      stream
    };
  } catch (error) {
    throw new AppError(502, "Failed to retrieve file from storage.", {
      reason: error instanceof Error ? error.message : "Unknown storage error"
    });
  }
};
