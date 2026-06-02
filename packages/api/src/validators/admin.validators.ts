import { z } from 'zod';

export const createTsoByAdminSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().optional(),
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

export const createAdminSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number')
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  role: z.enum(['SuperAdmin', 'CSM', 'HOP', 'TeamLead', 'Fincon']).default('CSM'),
});

export const updateAdminRoleSchema = z.object({
  role: z.enum(['SuperAdmin', 'CSM', 'HOP', 'TeamLead', 'Fincon']),
});

export const updateAdminStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export const updateAdminSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    email: z.string().email().toLowerCase().optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number')
      .trim()
      .optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .optional(),
    role: z.enum(['SuperAdmin', 'CSM', 'HOP', 'TeamLead', 'Fincon']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const updateTsoStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export const updateTsoSchema = z
  .object({
    name: z.string().min(2).max(100).trim().optional(),
    email: z.string().email().toLowerCase().optional(),
    phone: z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number')
      .trim()
      .optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128)
      .optional(),
    status: z.enum(['active', 'suspended']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const confirmCollectionsBulkSchema = z.object({
  collectionIds: z.array(z.string().min(1).trim()).min(1).max(500),
});

export type CreateTsoByAdminBody = z.infer<typeof createTsoByAdminSchema>;
export type CreateAdminBody = z.infer<typeof createAdminSchema>;
export type UpdateAdminRoleBody = z.infer<typeof updateAdminRoleSchema>;
export type UpdateAdminStatusBody = z.infer<typeof updateAdminStatusSchema>;
export type UpdateAdminBody = z.infer<typeof updateAdminSchema>;
export type UpdateTsoStatusBody = z.infer<typeof updateTsoStatusSchema>;
export type UpdateTsoBody = z.infer<typeof updateTsoSchema>;
export type ConfirmCollectionsBulkBody = z.infer<typeof confirmCollectionsBulkSchema>;
