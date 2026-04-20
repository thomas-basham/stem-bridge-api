import type { Prisma } from "../../generated/prisma/client";
import { ActivityEventType } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import type { CreateFileAssetMetadataInput } from "./file-asset.schemas";

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

export const createFileAssetMetadata = async (
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
