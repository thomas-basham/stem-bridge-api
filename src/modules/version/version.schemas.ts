import { z } from "zod";

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => {
      if (!value || value.length === 0) {
        return undefined;
      }

      return value;
    });

export const projectVersionParamsSchema = z.object({
  projectId: z.string().uuid()
});

export const versionParamsSchema = z.object({
  versionId: z.string().uuid()
});

export const createVersionBodySchema = z.object({
  notes: optionalTrimmedString(5000)
});

export type CreateVersionInput = z.infer<typeof createVersionBodySchema>;
