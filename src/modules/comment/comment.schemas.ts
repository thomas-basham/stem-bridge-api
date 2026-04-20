import { z } from "zod";

export const versionCommentParamsSchema = z.object({
  versionId: z.string().uuid()
});

export const commentParamsSchema = z.object({
  commentId: z.string().uuid()
});

export const createCommentBodySchema = z.object({
  timestampSeconds: z.coerce.number().min(0).max(86_400),
  text: z.string().trim().min(1).max(2_000)
});

export type CreateCommentInput = z.infer<typeof createCommentBodySchema>;
