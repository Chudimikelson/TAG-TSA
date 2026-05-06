import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.NODE_ENV = 'test';

// Mock all DB models and services before importing the worker processor
vi.mock('../models/Transaction.js', () => ({
  TransactionModel: { findOne: vi.fn() },
}));

vi.mock('../models/Collection.js', () => ({
  CollectionModel: { findOne: vi.fn() },
}));

vi.mock('../models/Member.js', () => ({
  MemberModel: { findOne: vi.fn() },
}));

vi.mock('../services/audit.service.js', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

// Import the private processor by extracting it via the worker factory
// We test the logic by calling worker internals through a spy on Worker
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation((_queue, processor) => {
    return { processor, on: vi.fn() };
  }),
  Queue: vi.fn().mockReturnValue({ add: vi.fn() }),
}));

vi.mock('../lib/redis.js', () => ({ getRedisClient: vi.fn().mockReturnValue({}) }));

import { TransactionModel } from '../models/Transaction.js';
import { CollectionModel } from '../models/Collection.js';
import { MemberModel } from '../models/Member.js';
import { audit } from '../services/audit.service.js';
import { startPaymentMatchWorker } from '../workers/paymentMatch.worker.js';
import { Worker } from 'bullmq';

// Extract the processor function passed to the Worker constructor
function getProcessor() {
  startPaymentMatchWorker();
  const ctor = vi.mocked(Worker);
  const lastCall = ctor.mock.calls[ctor.mock.calls.length - 1];
  return lastCall[1] as (job: { data: Record<string, unknown> }) => Promise<void>;
}

const baseJobData = {
  transactionId: 'tx-1',
  externalRef: 'ref-1',
  amount: 5000,
  method: 'transfer',
  timestamp: new Date(),
};

describe('paymentMatch.worker', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('flags transaction when phone cannot be resolved to a member', async () => {
    const saveTx = vi.fn().mockResolvedValue({});
    vi.mocked(TransactionModel.findOne).mockResolvedValueOnce({ transactionId: 'tx-1', save: saveTx, status: 'unmatched' } as never);
    vi.mocked(MemberModel.findOne).mockResolvedValueOnce(null);

    const processor = getProcessor();
    await processor({ data: { ...baseJobData, phone: '+2348000000001' } });

    expect(saveTx).toHaveBeenCalledOnce();
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'transaction.flagged' }));
  });

  it('flags transaction when no matching collection found', async () => {
    const saveTx = vi.fn().mockResolvedValue({});
    vi.mocked(TransactionModel.findOne).mockResolvedValueOnce({ transactionId: 'tx-1', save: saveTx, status: 'unmatched' } as never);
    vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'member-1' } as never);
    vi.mocked(CollectionModel.findOne).mockReturnValueOnce({ sort: vi.fn().mockResolvedValueOnce(null) } as never);

    const processor = getProcessor();
    await processor({ data: { ...baseJobData, phone: '+2348000000001' } });

    expect(saveTx).toHaveBeenCalledOnce();
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'transaction.flagged' }));
  });

  it('matches transaction to collection when member and amount align', async () => {
    const saveTx = vi.fn().mockResolvedValue({});
    const saveCol = vi.fn().mockResolvedValue({});

    vi.mocked(TransactionModel.findOne).mockResolvedValueOnce({ transactionId: 'tx-1', save: saveTx, status: 'unmatched' } as never);
    vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'member-1' } as never);
    vi.mocked(CollectionModel.findOne).mockReturnValueOnce({
      sort: vi.fn().mockResolvedValueOnce({ collectionId: 'col-1', save: saveCol, status: 'pending' }),
    } as never);

    const processor = getProcessor();
    await processor({ data: { ...baseJobData, phone: '+2348000000001' } });

    expect(saveTx).toHaveBeenCalledOnce();
    expect(saveCol).toHaveBeenCalledOnce();
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'transaction.matched' }));
  });
});
