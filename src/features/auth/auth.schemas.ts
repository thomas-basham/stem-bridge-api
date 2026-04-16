import { z } from "zod";

export const registerSchema = {
  body: z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72),
    displayName: z.string().trim().min(2).max(80)
  })
};

export const loginSchema = {
  body: z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72)
  })
};

export const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(32).max(512)
  })
};

export type RegisterInput = z.infer<typeof registerSchema.body>;
export type LoginInput = z.infer<typeof loginSchema.body>;
export type RefreshInput = z.infer<typeof refreshSchema.body>;

