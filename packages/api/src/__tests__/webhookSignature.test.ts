import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';

process.env.PAYMENT_WEBHOOK_SECRET = 'test_webhook_secret';

import { verifyWebhookSignature } from '../lib/webhookSignature.js';
import { AppError } from '../middleware/errorHandler.js';

function makeSignature(body: Buffer, secret: string): string {
  const hex = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${hex}`;
}

describe('webhookSignature', () => {
  const body = Buffer.from(JSON.stringify({ externalRef: 'ref-1', amount: 5000 }));

  it('passes for a valid signature', () => {
    const sig = makeSignature(body, 'test_webhook_secret');
    expect(() => verifyWebhookSignature(body, sig)).not.toThrow();
  });

  it('throws 401 for a tampered body', () => {
    const sig = makeSignature(body, 'test_webhook_secret');
    const tampered = Buffer.from('{"externalRef":"evil"}');
    expect(() => verifyWebhookSignature(tampered, sig)).toThrow(AppError);
  });

  it('throws 401 for a wrong secret', () => {
    const sig = makeSignature(body, 'wrong_secret');
    expect(() => verifyWebhookSignature(body, sig)).toThrow(AppError);
  });

  it('throws 401 for a malformed header (missing algo prefix)', () => {
    expect(() => verifyWebhookSignature(body, 'deadbeef')).toThrow(AppError);
  });
});
