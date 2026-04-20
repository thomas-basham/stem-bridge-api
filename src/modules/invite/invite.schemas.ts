import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(255)
  .transform((value) => value.toLowerCase());

export const projectInviteParamsSchema = z.object({
  projectId: z.string().uuid()
});

export const createInviteBodySchema = z.object({
  email: emailSchema
});

export const inviteTokenParamsSchema = z.object({
  token: z.string().trim().min(32).max(255)
});

export type CreateInviteInput = z.infer<typeof createInviteBodySchema>;
export type InviteTokenParamsInput = z.infer<typeof inviteTokenParamsSchema>;
