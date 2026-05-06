import { z } from 'zod';

export const registerTsoSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number')
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  deviceId: z.string().min(1).max(255).trim(),
});

export const loginSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number')
    .trim(),
  password: z.string().min(1),
  deviceId: z.string().min(1).max(255).trim().optional(),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number')
    .trim(),
  code: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const adminLoginSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(1),
});

export type RegisterTsoBody = z.infer<typeof registerTsoSchema>;
export type LoginBody = z.infer<typeof loginSchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;
export type AdminLoginBody = z.infer<typeof adminLoginSchema>;
