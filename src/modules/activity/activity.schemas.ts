import { z } from "zod";

export const projectActivityParamsSchema = z.object({
  projectId: z.string().uuid()
});

export const projectActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20)
});

export type ProjectActivityQueryInput = z.infer<typeof projectActivityQuerySchema>;
