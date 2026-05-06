import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Verifies the HMAC-SHA256 signature sent by the payment provider.
 *
 * Expected header: X-Payment-Signature: sha256=<hex-digest>
 *
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyWebhookSignature(rawBody: Buffer, signatureHeader: string): void {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('PAYMENT_WEBHOOK_SECRET environment variable is not set');
  }

  // Header format: "sha256=<hex>"
  const [algo, receivedHex] = signatureHeader.split('=');
  if (algo !== 'sha256' || !receivedHex) {
    throw new AppError(401, 'Malformed signature header');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(receivedHex, 'hex');

  if (
    expectedBuf.length !== receivedBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, receivedBuf)
  ) {
    throw new AppError(401, 'Invalid webhook signature');
  }
}
