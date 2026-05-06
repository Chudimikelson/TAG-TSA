import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.JWT_SECRET = 'test_secret_32_chars_minimum_here';
process.env.NODE_ENV = 'test';
process.env.S3_ENDPOINT = 'http://localhost:9000';
process.env.S3_BUCKET = 'tagora-receipts';
process.env.S3_ACCESS_KEY = 'minioadmin';
process.env.S3_SECRET_KEY = 'minioadmin';

vi.mock('../models/Collection.js', () => ({
  CollectionModel: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../models/Member.js', () => ({
  MemberModel: {
    updateOne: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../models/AuditLog.js', () => ({
  AuditLogModel: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../services/storage.service.js', () => ({
  uploadReceiptImage: vi.fn().mockResolvedValue('http://localhost:9000/tagora-receipts/receipts/tso-1/abc.jpg'),
}));

import { createCollection, getCollection } from '../services/collection.service.js';
import { CollectionModel } from '../models/Collection.js';
import { uploadReceiptImage } from '../services/storage.service.js';
import { AppError } from '../middleware/errorHandler.js';

const baseInput = {
  planId: 'plan-1',
  memberId: 'member-1',
  tsoId: 'tso-1',
  amount: 5000,
  method: 'cash' as const,
  timestamp: new Date(),
  idempotencyKey: 'key-abc-123',
};

describe('collection.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // -------------------------------------------------------------------------
  // createCollection
  // -------------------------------------------------------------------------
  describe('createCollection', () => {
    it('returns existing record without creating a new one on duplicate idempotency key', async () => {
      const existing = { collectionId: 'col-existing', ...baseInput };
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(existing as never);

      const result = await createCollection(baseInput);

      expect(result).toEqual(existing);
      expect(CollectionModel.create).not.toHaveBeenCalled();
    });

    it('creates a new collection when idempotency key is fresh', async () => {
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(null);
      const created = { collectionId: 'col-new', ...baseInput, status: 'pending' };
      vi.mocked(CollectionModel.create).mockResolvedValueOnce(created as never);

      const result = await createCollection(baseInput);

      expect(CollectionModel.create).toHaveBeenCalledOnce();
      expect(result.collectionId).toBe('col-new');
    });

    it('uploads receipt and stores URL when file is provided', async () => {
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(null);
      vi.mocked(CollectionModel.create).mockResolvedValueOnce({ collectionId: 'col-1', photoReceiptUrl: 'http://localhost:9000/tagora-receipts/receipts/tso-1/abc.jpg' } as never);

      const fakeFile = {
        buffer: Buffer.from('fake-image'),
        mimetype: 'image/jpeg',
        originalname: 'receipt.jpg',
      } as Express.Multer.File;

      await createCollection({ ...baseInput, receiptFile: fakeFile });

      expect(uploadReceiptImage).toHaveBeenCalledWith(
        expect.stringMatching(/^receipts\/tso-1\/.+\.jpeg$/),
        fakeFile.buffer,
        'image/jpeg',
      );
    });

    it('skips upload when no file is provided', async () => {
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(null);
      vi.mocked(CollectionModel.create).mockResolvedValueOnce({ collectionId: 'col-2' } as never);

      await createCollection(baseInput);

      expect(uploadReceiptImage).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getCollection
  // -------------------------------------------------------------------------
  describe('getCollection', () => {
    it('throws 404 when collection does not exist', async () => {
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(null);
      await expect(getCollection('col-missing', 'tso-1', 'tso')).rejects.toThrow(AppError);
    });

    it('throws 403 when TSO tries to access another TSO\'s collection', async () => {
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce({ collectionId: 'col-1', tsoId: 'tso-other' } as never);
      await expect(getCollection('col-1', 'tso-1', 'tso')).rejects.toThrow(AppError);
    });

    it('allows admin to access any collection', async () => {
      const col = { collectionId: 'col-1', tsoId: 'tso-other' };
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(col as never);
      const result = await getCollection('col-1', 'admin-1', 'admin');
      expect(result.collectionId).toBe('col-1');
    });

    it('allows TSO to access their own collection', async () => {
      const col = { collectionId: 'col-1', tsoId: 'tso-1' };
      vi.mocked(CollectionModel.findOne).mockResolvedValueOnce(col as never);
      const result = await getCollection('col-1', 'tso-1', 'tso');
      expect(result.collectionId).toBe('col-1');
    });
  });
});
