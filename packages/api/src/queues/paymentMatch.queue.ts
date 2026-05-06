import { Queue } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';
import { PaymentWebhookPayload } from '../validators/webhook.validators.js';

export const PAYMENT_MATCH_QUEUE = 'payment-match';

export interface PaymentMatchJobData extends PaymentWebhookPayload {
  transactionId: string;
}

let paymentMatchQueue: Queue<PaymentMatchJobData> | null = null;

export function getPaymentMatchQueue(): Queue<PaymentMatchJobData> {
  if (!paymentMatchQueue) {
    paymentMatchQueue = new Queue<PaymentMatchJobData>(PAYMENT_MATCH_QUEUE, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 86400 }, // keep completed jobs for 24 h
        removeOnFail: { age: 7 * 86400 }, // keep failed jobs for 7 days
      },
    });
  }
  return paymentMatchQueue;
}
