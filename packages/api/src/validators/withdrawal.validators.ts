import { z } from 'zod';

export const createWithdrawalSchema = z.object({
  memberId: z.string().min(1).trim(),
  planId: z.string().min(1).trim(),
  amount: z.number().int().positive(),
  disbursementMethod: z.enum(['bank_transfer', 'cash', 'mobile_money']),
});

export const reviewWithdrawalSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
});

export type CreateWithdrawalBody = z.infer<typeof createWithdrawalSchema>;
export type ReviewWithdrawalBody = z.infer<typeof reviewWithdrawalSchema>;
