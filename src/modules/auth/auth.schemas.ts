import { z } from "zod";

export const registerSchema = {
  body: z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72)
  })
};

export const loginSchema = {
  body: z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(8).max(72)
  })
};

export type RegisterInput = z.infer<typeof registerSchema.body>;
export type LoginInput = z.infer<typeof loginSchema.body>;
