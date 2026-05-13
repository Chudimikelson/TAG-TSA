import { z } from 'zod';

const optionalPhoneSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    return trimmed === '' ? undefined : trimmed;
  },
  z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number')
    .optional(),
);

const optionalTrimmedString = (min: number, max: number) =>
  z.preprocess(
    (val) => {
      if (typeof val !== 'string') return val;
      const trimmed = val.trim();
      return trimmed === '' ? undefined : trimmed;
    },
    z.string().min(min).max(max).trim().optional(),
  );

export const createMemberSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  phone: optionalPhoneSchema,
  email: z.string().email().optional(),
  address: z.string().min(2).max(200).trim().optional(),
  branch: z.string().min(1).max(100).trim().optional(),
  accountNumber: z.string().min(1).max(50).trim().optional(),
  nationalIdRef: z.string().min(1).max(100).trim().optional(),
});

export const updateMemberSchema = z
  .object({
    phone: optionalPhoneSchema,
    address: optionalTrimmedString(2, 200),
    accountNumber: optionalTrimmedString(1, 50),
    nationalIdRef: optionalTrimmedString(1, 100),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const createPlanSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  amount: z.number().int().positive(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  startDate: z.coerce.date(),
});

export const updatePlanSchema = z
  .object({
    name: optionalTrimmedString(1, 100),
    amount: z.number().int().positive().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    startDate: z.coerce.date().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export type CreateMemberBody = z.infer<typeof createMemberSchema>;
export type UpdateMemberBody = z.infer<typeof updateMemberSchema>;
export type CreatePlanBody = z.infer<typeof createPlanSchema>;
export type UpdatePlanBody = z.infer<typeof updatePlanSchema>;
