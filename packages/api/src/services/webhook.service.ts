import { v4 as uuidv4 } from 'uuid';
import { TransactionModel } from '../models/Transaction.js';
import { getPaymentMatchQueue } from '../queues/paymentMatch.queue.js';
import { verifyWebhookSignature } from '../lib/webhookSignature.js';
import { paymentWebhookSchema } from '../validators/webhook.validators.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../lib/logger.js';

/**
 * Processes an incoming payment webhook:
 * 1. Verifies HMAC signature.
 * 2. Parses and validates payload.
 * 3. Persists the transaction (idempotent on externalRef).
 * 4. Enqueues a matching job.
 */
export async function processPaymentWebhook(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): Promise<{ transactionId: string; queued: boolean }> {
  if (!signatureHeader) {
    throw new AppError(401, 'Missing X-Payment-Signature header');
  }

  verifyWebhookSignature(rawBody, signatureHeader);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new AppError(400, 'Webhook body is not valid JSON');
  }

  const payload = paymentWebhookSchema.parse(parsed);

  // Idempotency — skip if we've already seen this externalRef
  const existing = await TransactionModel.findOne({ externalRef: payload.externalRef });
  if (existing) {
    logger.info(`Webhook duplicate ignored: externalRef=${payload.externalRef}`);
    return { transactionId: existing.transactionId, queued: false };
  }

  const transactionId = uuidv4();

  await TransactionModel.create({
    transactionId,
    externalRef: payload.externalRef,
    amount: payload.amount,
    method: payload.method,
    timestamp: payload.timestamp,
    status: 'unmatched',
  });

  await getPaymentMatchQueue().add('match', { ...payload, transactionId });

  logger.info(`Payment webhook received: transactionId=${transactionId}`);
  return { transactionId, queued: true };
}
