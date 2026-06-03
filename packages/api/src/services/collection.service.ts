import { v4 as uuidv4 } from 'uuid';
import { CollectionModel, CollectionDocument } from '../models/Collection.js';
import { MemberModel } from '../models/Member.js';
import { uploadReceiptImage } from './storage.service.js';
import { audit } from './audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { CreateCollectionBody } from '../validators/collection.validators.js';

export interface CreateCollectionInput extends CreateCollectionBody {
  tsoId: string;
  receiptFile?: Express.Multer.File;
}

/**
 * Creates a new collection record.
 *
 * Idempotency: if a record already exists for the given idempotencyKey,
 * the existing record is returned without error (safe retry for offline sync).
 *
 * Receipt photo is uploaded to object storage before persisting the URL.
 */
export async function createCollection(
  input: CreateCollectionInput,
): Promise<CollectionDocument> {
  // Idempotency check — return existing record on duplicate key
  const existing = await CollectionModel.findOne({ idempotencyKey: input.idempotencyKey });
  if (existing) {
    return existing;
  }

  let photoReceiptUrl: string | undefined;

  if (input.receiptFile) {
    const ext = input.receiptFile.mimetype.split('/')[1] ?? 'jpg';
    const key = `receipts/${input.tsoId}/${uuidv4()}.${ext}`;
    photoReceiptUrl = await uploadReceiptImage(
      key,
      input.receiptFile.buffer,
      input.receiptFile.mimetype,
    );
  }

  const collectionId = uuidv4();

  const memberUpdate = await MemberModel.updateOne(
    { memberId: input.memberId },
    { $inc: { savingsBalance: input.amount } },
  );
  if (!memberUpdate.matchedCount) {
    throw new AppError(404, 'Member not found for this collection');
  }

  const collection = await CollectionModel.create({
    collectionId,
    planId: input.planId,
    memberId: input.memberId,
    tsoId: input.tsoId,
    amount: input.amount,
    method: input.method,
    timestamp: input.timestamp,
    photoReceiptUrl,
    geo: input.geo,
    status: 'confirmed',
    idempotencyKey: input.idempotencyKey,
  });

  await audit({
    actorId: input.tsoId,
    action: 'collection.created',
    targetId: collectionId,
    metadata: {
      memberId: input.memberId,
      planId: input.planId,
      amount: input.amount,
      method: input.method,
    },
  });

  return collection;
}

/**
 * Fetches a single collection by collectionId.
 * TSOs may only retrieve their own collections; admins may retrieve any.
 */
export async function getCollection(
  collectionId: string,
  actorId: string,
  actorRole: string,
): Promise<CollectionDocument> {
  const collection = await CollectionModel.findOne({ collectionId });

  if (!collection) {
    throw new AppError(404, 'Collection not found');
  }

  if (actorRole === 'tso' && collection.tsoId !== actorId) {
    throw new AppError(403, 'Access denied');
  }

  return collection;
}

/**
 * Lists collections. TSOs see only their own; admins see all.
 */
export async function listCollections(
  actorId: string,
  actorRole: string,
): Promise<CollectionDocument[]> {
  const filter = actorRole === 'tso' ? { tsoId: actorId } : {};
  return CollectionModel.find(filter).sort({ timestamp: -1 });
}
