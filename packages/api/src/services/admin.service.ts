import crypto, { randomUUID } from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { CollectionModel } from '../models/Collection.js';
import { TsoModel } from '../models/Tso.js';
import { v4 as uuidv4 } from 'uuid';
import { CreateTsoByAdminBody } from '../validators/admin.validators.js';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 310_000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export async function flagCollection(collectionId: string, adminId: string) {
  const collection = await CollectionModel.findOne({ collectionId });
  if (!collection) throw new AppError(404, 'Collection not found');

  if (collection.status === 'flagged') {
    throw new AppError(409, 'Collection is already flagged');
  }

  collection.status = 'flagged';
  await collection.save();

  await AuditLogModel.create({
    logId: randomUUID(),
    actorId: adminId,
    action: 'collection_flagged',
    targetId: collectionId,
  });

  return collection;
}

export async function createTsoByAdmin(input: CreateTsoByAdminBody, adminId: string) {
  const existing = await TsoModel.findOne({ phone: input.phone });
  if (existing) {
    throw new AppError(409, 'Phone number already registered');
  }

  const tso = await TsoModel.create({
    tsoId: uuidv4(),
    name: input.name,
    phone: input.phone,
    passwordHash: hashPassword(input.password),
    deviceId: input.deviceId,
    assignedAreas: input.assignedAreas,
    status: 'active',
  });

  await AuditLogModel.create({
    logId: randomUUID(),
    actorId: adminId,
    action: 'tso_created',
    targetId: tso.tsoId,
    metadata: { phone: tso.phone, deviceId: tso.deviceId },
  });

  return {
    tsoId: tso.tsoId,
    name: tso.name,
    phone: tso.phone,
    deviceId: tso.deviceId,
    assignedAreas: tso.assignedAreas,
    status: tso.status,
    createdAt: tso.createdAt,
  };
}

export async function listTsos() {
  return TsoModel.find({}, {
    _id: 0,
    __v: 0,
    passwordHash: 0,
    updatedAt: 0,
  }).sort({ createdAt: -1 });
}
