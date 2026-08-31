import { z } from "zod";

export const signupBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignupBody = z.infer<typeof signupBodySchema>;

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    emailVerified: z.boolean(),
  }),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});
