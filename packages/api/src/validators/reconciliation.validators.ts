import { z } from 'zod';

export const createReconciliationSchema = z.object({
  date: z.string().datetime({ message: 'date must be ISO 8601' }),
  expectedTotal: z.number().int().positive(),
  cashCounted: z.number().int().min(0),
  transfersTotal: z.number().int().min(0),
  notes: z.string().max(500).optional(),
});

export const manualMatchSchema = z.object({
  collectionId: z.string().min(1),
});

export type CreateReconciliationInput = z.infer<typeof createReconciliationSchema>;
export type ManualMatchInput = z.infer<typeof manualMatchSchema>;
