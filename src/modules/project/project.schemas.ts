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

export const createProjectBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  bpm: z.coerce.number().int().min(1).max(400).optional(),
  musicalKey: optionalTrimmedString(32)
});

export const projectParamsSchema = z.object({
  projectId: z.string().uuid()
});

export type CreateProjectInput = z.infer<typeof createProjectBodySchema>;
export type ProjectParamsInput = z.infer<typeof projectParamsSchema>;
