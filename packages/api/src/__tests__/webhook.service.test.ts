import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

process.env.PAYMENT_WEBHOOK_SECRET = 'test_webhook_secret';
process.env.NODE_ENV = 'test';

vi.mock('../models/Transaction.js', () => ({
  TransactionModel: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../queues/paymentMatch.queue.js', () => ({
  getPaymentMatchQueue: vi.fn().mockReturnValue({
    add: vi.fn().mockResolvedValue({}),
  }),
}));

import { processPaymentWebhook } from '../services/webhook.service.js';
import { TransactionModel } from '../models/Transaction.js';
import { getPaymentMatchQueue } from '../queues/paymentMatch.queue.js';
import { AppError } from '../middleware/errorHandler.js';

function makeSignature(body: Buffer): string {
  const hex = crypto
    .createHmac('sha256', 'test_webhook_secret')
    .update(body)
    .digest('hex');
  return `sha256=${hex}`;
}

const validPayload = {
  externalRef: 'bank-ref-001',
  amount: 5000,
  method: 'transfer',
  timestamp: new Date().toISOString(),
};

describe('webhook.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('throws 401 when signature header is missing', async () => {
    const body = Buffer.from(JSON.stringify(validPayload));
    await expect(processPaymentWebhook(body, undefined)).rejects.toThrow(AppError);
  });

  it('throws 401 when signature is invalid', async () => {
    const body = Buffer.from(JSON.stringify(validPayload));
    await expect(processPaymentWebhook(body, 'sha256=bad')).rejects.toThrow(AppError);
  });

  it('throws 400 when body is not valid JSON', async () => {
    const body = Buffer.from('not-json');
    const sig = makeSignature(body);
    await expect(processPaymentWebhook(body, sig)).rejects.toThrow(AppError);
  });

  it('returns existing transactionId without re-queuing on duplicate externalRef', async () => {
    vi.mocked(TransactionModel.findOne).mockResolvedValueOnce({
      transactionId: 'tx-existing',
    } as never);

    const body = Buffer.from(JSON.stringify(validPayload));
    const sig = makeSignature(body);
    const result = await processPaymentWebhook(body, sig);

    expect(result.transactionId).toBe('tx-existing');
    expect(result.queued).toBe(false);
    expect(TransactionModel.create).not.toHaveBeenCalled();
    expect(getPaymentMatchQueue().add).not.toHaveBeenCalled();
  });

  it('creates transaction and enqueues job for fresh externalRef', async () => {
    vi.mocked(TransactionModel.findOne).mockResolvedValueOnce(null);
    vi.mocked(TransactionModel.create).mockResolvedValueOnce({} as never);

    const body = Buffer.from(JSON.stringify(validPayload));
    const sig = makeSignature(body);
    const result = await processPaymentWebhook(body, sig);

    expect(TransactionModel.create).toHaveBeenCalledOnce();
    expect(getPaymentMatchQueue().add).toHaveBeenCalledWith(
      'match',
      expect.objectContaining({ externalRef: 'bank-ref-001' }),
    );
    expect(result.queued).toBe(true);
    expect(result.transactionId).toBeDefined();
  });
});
