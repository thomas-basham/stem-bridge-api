import { FileAssetType } from "../../generated/prisma/enums";
import { z } from "zod";

export const versionFileParamsSchema = z.object({
  versionId: z.string().uuid()
});

export const versionFileAssetParamsSchema = z.object({
  versionId: z.string().uuid(),
  fileId: z.string().uuid()
});

export const uploadFileAssetBodySchema = z.object({
  type: z.nativeEnum(FileAssetType)
});

export const createFileAssetMetadataBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  originalName: z.string().trim().min(1).max(255),
  type: z.nativeEnum(FileAssetType),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.coerce.number().int().positive().max(2_000_000_000),
  storageKey: z.string().trim().min(1).max(1024),
  url: z.string().trim().url().max(2048)
});

export type UploadFileAssetInput = z.infer<typeof uploadFileAssetBodySchema>;
export type CreateFileAssetMetadataInput = z.infer<typeof createFileAssetMetadataBodySchema>;
