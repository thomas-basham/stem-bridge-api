import { FileAssetType } from "../../generated/prisma/enums";
import { z } from "zod";

export const versionFileParamsSchema = z.object({
  versionId: z.string().uuid()
});

export const createFileAssetMetadataBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  originalName: z.string().trim().min(1).max(255),
  type: z.nativeEnum(FileAssetType),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.coerce.number().int().positive().max(5_000_000_000),
  storageKey: z.string().trim().min(1).max(1024),
  url: z.string().trim().url().max(2048)
});

export type CreateFileAssetMetadataInput = z.infer<typeof createFileAssetMetadataBodySchema>;
