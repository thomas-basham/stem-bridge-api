import type { Prisma } from "../../generated/prisma/client";
import { ActivityEventType } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import {
  buildVersionFileStorageKey,
  deleteFileObject,
  getFileStream,
  getPublicFileUrl,
  sanitizeFileName,
  uploadFileBuffer
} from "../../lib/storage/s3";
import { AppError } from "../../utils/app-error";
import type { CreateFileAssetMetadataInput, UploadFileAssetInput } from "./file-asset.schemas";

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
    sizeBytes: fileAsset.sizeBytes,
    storageKey: fileAsset.storageKey,
    url: fileAsset.url,
    createdAt: fileAsset.createdAt
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
  return createFileAssetRecord(versionId, projectId, input);
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

export const downloadVersionFile = async (params: {
  versionId: string;
  fileId: string;
}) => {
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

  try {
    const stream = await getFileStream(fileAsset.storageKey);

    return {
      file: toFileAsset(fileAsset),
      stream
    };
  } catch (error) {
    throw new AppError(502, "Failed to retrieve file from storage.", {
      reason: error instanceof Error ? error.message : "Unknown storage error"
    });
  }
};
