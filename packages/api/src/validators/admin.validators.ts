import { z } from 'zod';

export const createTsoByAdminSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number')
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  deviceId: z.string().min(1).max(255).trim().default('web'),
  assignedAreas: z.array(z.string().min(1).max(100).trim()).optional().default([]),
});

export type CreateTsoByAdminBody = z.infer<typeof createTsoByAdminSchema>;
