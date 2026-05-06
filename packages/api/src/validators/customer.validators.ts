import { z } from 'zod';

const phone = z
  .string()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number')
  .trim();

export const customerRequestOtpSchema = z.object({ phone });

export const customerVerifyOtpSchema = z.object({
  phone,
  code: z.string().length(6).regex(/^\d{6}$/, 'OTP must be 6 digits'),
});
