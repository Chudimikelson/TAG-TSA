import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.NODE_ENV = 'test';

vi.mock('../models/ReconciliationRecord.js', () => ({
  ReconciliationRecordModel: { create: vi.fn() },
}));

vi.mock('../models/Transaction.js', () => ({
  TransactionModel: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../models/Collection.js', () => ({
  CollectionModel: {
    findOne: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../models/AuditLog.js', () => ({
  AuditLogModel: { create: vi.fn().mockResolvedValue({}) },
}));

import {
  createReconciliation,
  getUnmatchedTransactions,
  manuallyMatchTransaction,
  exportCollectionsCsv,
} from '../services/reconciliation.service.js';
import { flagCollection } from '../services/admin.service.js';
import { ReconciliationRecordModel } from '../models/ReconciliationRecord.js';
import { TransactionModel } from '../models/Transaction.js';
import { CollectionModel } from '../models/Collection.js';
import { AppError } from '../middleware/errorHandler.js';

describe('reconciliation.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // -------------------------------------------------------------------------
  // createReconciliation
  // -------------------------------------------------------------------------
  describe('createReconciliation', () => {
    it('creates record with correct variance', async () => {
      vi.mocked(ReconciliationRecordModel.create).mockResolvedValueOnce({
        reconId: 'recon-1',
        variance: 500,
      } as never);

      const result = await createReconciliation(
        {
          date: new Date('2026-05-01').toISOString(),
          expectedTotal: 10000,
          cashCounted: 7000,
          transfersTotal: 3500,
        },
        'admin-1',
      );

      const callArg = vi.mocked(ReconciliationRecordModel.create).mock.calls[0][0] as {
        variance: number;
      };
      expect(callArg.variance).toBe(500); // 7000 + 3500 - 10000
      expect(result.reconId).toBe('recon-1');
    });
  });

  // -------------------------------------------------------------------------
  // getUnmatchedTransactions
  // -------------------------------------------------------------------------
  describe('getUnmatchedTransactions', () => {
    it('queries transactions with status unmatched', async () => {
      const sortMock = vi.fn().mockResolvedValue([{ transactionId: 'tx-1' }]);
      vi.mocked(TransactionModel.find).mockReturnValueOnce({ sort: sortMock } as never);

      const result = await getUnmatchedTransactions();
      expect(TransactionModel.find).toHaveBeenCalledWith({ status: 'unmatched' });
      expect(result).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // manuallyMatchTransaction
  // -------------------------------------------------------------------------
  describe('manuallyMatchTransaction', () => {
    it('throws 404 when transaction not found', async () => {
      vi.mocked(TransactionModel.findOne).mockResolvedValueOnce(null);
      await expect(
        manuallyMatchTransaction('tx-missing', { collectionId: 'col-1' }, 'admin-1'),
      ).rejects.toThrow(AppError);
    });

    it('throws 409 when transaction is not unmatched', async () => {
      vi.mocked(TransactionModel.findOne).mockResolvedValueOnce({
        transactionId: 'tx-1',
        status: 'matched',
        save: vi.fn(),
      } as never);
      await expect(
        manuallyMatchTransaction('tx-1', { collectionId: 'col-1' }, 'admin-1'),
      ).rejects.toThrow(AppError);
    });

    it('throws 404 when collection not found', async () => {
      vi.mocked(TransactionModel.findOne).mockResolvedValueOnce({
        transactionId: 'tx-1',
        status: 'unmatched',
        save: vi.fn(),
      } as never);
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(null);
      await expect(
        manuallyMatchTransaction('tx-1', { collectionId: 'col-missing' }, 'admin-1'),
      ).rejects.toThrow(AppError);
    });

    it('links transaction and collection on success', async () => {
      const saveTx = vi.fn().mockResolvedValue({});
      const saveCol = vi.fn().mockResolvedValue({});
      const tx = { transactionId: 'tx-1', status: 'unmatched', memberId: '', save: saveTx };
      const col = { collectionId: 'col-1', memberId: 'member-1', status: 'pending', matchedTransactionId: '', save: saveCol };

      vi.mocked(TransactionModel.findOne).mockResolvedValueOnce(tx as never);
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(col as never);

      const result = await manuallyMatchTransaction('tx-1', { collectionId: 'col-1' }, 'admin-1');

      expect(tx.status).toBe('matched');
      expect(col.status).toBe('matched');
      expect(col.matchedTransactionId).toBe('tx-1');
      expect(saveTx).toHaveBeenCalledOnce();
      expect(saveCol).toHaveBeenCalledOnce();
      expect(result).toEqual({ transactionId: 'tx-1', collectionId: 'col-1' });
    });
  });

  // -------------------------------------------------------------------------
  // exportCollectionsCsv
  // -------------------------------------------------------------------------
  describe('exportCollectionsCsv', () => {
    it('returns CSV string with header and rows', async () => {
      const sortMock = vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          {
            collectionId: 'col-1',
            planId: 'plan-1',
            memberId: 'member-1',
            tsoId: 'tso-1',
            amount: 5000,
            method: 'cash',
            status: 'pending',
            timestamp: new Date('2026-05-01T00:00:00Z'),
          },
        ]),
      });
      vi.mocked(CollectionModel.find).mockReturnValueOnce({ sort: sortMock } as never);

      const csv = await exportCollectionsCsv();
      expect(csv).toContain('collectionId,planId,memberId,tsoId,amount,method,status,timestamp');
      expect(csv).toContain('col-1,plan-1,member-1,tso-1,5000,cash,pending,2026-05-01T00:00:00.000Z');
    });
  });
});

// ===========================================================================
// admin.service
// ===========================================================================
describe('admin.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('flagCollection', () => {
    it('throws 404 when collection not found', async () => {
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(null);
      await expect(flagCollection('col-missing', 'admin-1')).rejects.toThrow(AppError);
    });

    it('throws 409 when collection is already flagged', async () => {
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce({
        collectionId: 'col-1',
        status: 'flagged',
        save: vi.fn(),
      } as never);
      await expect(flagCollection('col-1', 'admin-1')).rejects.toThrow(AppError);
    });

    it('sets status to flagged and saves', async () => {
      const save = vi.fn().mockResolvedValue({});
      const col = { collectionId: 'col-1', status: 'pending', save };
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(col as never);

      await flagCollection('col-1', 'admin-1');
      expect(col.status).toBe('flagged');
      expect(save).toHaveBeenCalledOnce();
    });
  });
});
