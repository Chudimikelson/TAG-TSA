import { z } from 'zod';

// Payload shape sent by the bank/USSD webhook provider
export const paymentWebhookSchema = z.object({
  externalRef: z.string().min(1).trim(),
  amount: z.number().int().positive(),
  method: z.enum(['transfer', 'ussd']),
  timestamp: z.coerce.date(),
  // Optional: provider may include a phone that maps to a member
  phone: z.string().optional(),
});

export type PaymentWebhookPayload = z.infer<typeof paymentWebhookSchema>;
