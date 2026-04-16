import { ProjectRole } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

export const createProjectSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(120),
    description: optionalTrimmedString(2000)
  })
};

export const projectIdSchema = {
  params: z.object({
    projectId: z.string().uuid()
  })
};

export const inviteCollaboratorSchema = {
  params: projectIdSchema.params,
  body: z.object({
    email: z.string().trim().email().max(255),
    role: z
      .nativeEnum(ProjectRole)
      .refine((role) => role !== ProjectRole.OWNER, "Invitations cannot assign the OWNER role.")
  })
};

export const acceptInvitationSchema = {
  params: z.object({
    token: z.string().min(32).max(255)
  })
};

export type CreateProjectInput = z.infer<typeof createProjectSchema.body>;
export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema.body>;

