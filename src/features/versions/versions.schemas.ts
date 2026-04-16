import { VersionFileKind } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const versionIdParams = z.object({
  versionId: z.string().uuid()
});

const projectVersionParams = z.object({
  projectId: z.string().uuid()
});

export const listProjectVersionsSchema = {
  params: projectVersionParams
};

export const createVersionSchema = {
  params: projectVersionParams,
  body: z.object({
    label: z.string().trim().min(1).max(120),
    notes: optionalTrimmedString(4000),
    sourceDaw: optionalTrimmedString(80),
    files: z
      .array(
        z.object({
          fileName: z.string().trim().min(1).max(255),
          kind: z.nativeEnum(VersionFileKind),
          contentType: z.string().trim().min(1).max(255),
          sizeBytes: z.coerce.number().int().positive().max(2_000_000_000)
        })
      )
      .max(100)
      .default([])
  })
};

export const versionIdSchema = {
  params: versionIdParams
};

export const completeVersionFileUploadSchema = {
  params: versionIdParams.extend({
    fileId: z.string().uuid()
  })
};

export const createVersionCommentSchema = {
  params: versionIdParams,
  body: z.object({
    body: z.string().trim().min(1).max(2000),
    timestampMs: z.coerce.number().int().min(0).optional()
  })
};

export type CreateVersionInput = z.infer<typeof createVersionSchema.body>;
export type CreateVersionCommentInput = z.infer<typeof createVersionCommentSchema.body>;

