import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(255)
  .transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8).max(72);

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export type RegisterInput = z.infer<typeof registerBodySchema>;
export type LoginInput = z.infer<typeof loginBodySchema>;
