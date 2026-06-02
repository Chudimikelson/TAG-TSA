import crypto, { randomUUID } from 'crypto';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { CollectionModel } from '../models/Collection.js';
import { MemberModel } from '../models/Member.js';
import { TsoModel } from '../models/Tso.js';
import { AdminModel, AdminRole, AdminStatus } from '../models/Admin.js';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateTsoByAdminBody,
  CreateAdminBody,
  UpdateAdminBody,
  UpdateAdminRoleBody,
  UpdateAdminStatusBody,
  UpdateTsoBody,
  UpdateTsoStatusBody,
} from '../validators/admin.validators.js';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 310_000, 32, 'sha256').toString('hex');
  return `${salt}:${hash}`;
}

export type ReviewCollectionDecision = 'confirmed' | 'rejected';

export interface BulkCollectionReviewResult {
  requestedCount: number;
  processedCount: number;
  decision: ReviewCollectionDecision;
  skipped: Array<{ collectionId: string; reason: 'not_found' | 'not_pending' | 'member_not_found' }>;
}

export async function reviewCollection(
  collectionId: string,
  decision: ReviewCollectionDecision,
  adminId: string,
) {
  const collection = await CollectionModel.findOne({ collectionId });
  if (!collection) throw new AppError(404, 'Collection not found');

  if (collection.status !== 'pending') {
    throw new AppError(409, 'Only pending collections can be reviewed');
  }

  if (decision === 'confirmed') {
    const memberUpdate = await MemberModel.updateOne(
      { memberId: collection.memberId },
      { $inc: { savingsBalance: collection.amount } },
    );

    if (!memberUpdate.matchedCount) {
      throw new AppError(404, 'Member not found for this collection');
    }

    collection.status = 'confirmed';
  } else {
    collection.status = 'rejected';
  }

  await collection.save();

  await AuditLogModel.create({
    logId: randomUUID(),
    actorId: adminId,
    action: decision === 'confirmed' ? 'collection_confirmed' : 'collection_rejected',
    targetId: collectionId,
  });

  return collection;
}

export async function reviewCollectionsBulk(
  collectionIds: string[],
  decision: ReviewCollectionDecision,
  adminId: string,
): Promise<BulkCollectionReviewResult> {
  const dedupedIds = Array.from(new Set(collectionIds));
  const collections = await CollectionModel.find({ collectionId: { $in: dedupedIds } });
  const byId = new Map(collections.map((c) => [c.collectionId, c]));

  const skipped: Array<{ collectionId: string; reason: 'not_found' | 'not_pending' | 'member_not_found' }> = [];
  let processedCount = 0;

  for (const collectionId of dedupedIds) {
    const collection = byId.get(collectionId);
    if (!collection) {
      skipped.push({ collectionId, reason: 'not_found' });
      continue;
    }

    if (collection.status !== 'pending') {
      skipped.push({ collectionId, reason: 'not_pending' });
      continue;
    }

    if (decision === 'confirmed') {
      const memberUpdate = await MemberModel.updateOne(
        { memberId: collection.memberId },
        { $inc: { savingsBalance: collection.amount } },
      );

      if (!memberUpdate.matchedCount) {
        skipped.push({ collectionId, reason: 'member_not_found' });
        continue;
      }
    }

    collection.status = decision;
    await collection.save();
    processedCount += 1;

    await AuditLogModel.create({
      logId: randomUUID(),
      actorId: adminId,
      action: decision === 'confirmed' ? 'collection_confirmed' : 'collection_rejected',
      targetId: collectionId,
    });
  }

  return {
    requestedCount: dedupedIds.length,
    processedCount,
    decision,
    skipped,
  };
}

export async function createTsoByAdmin(input: CreateTsoByAdminBody, adminId: string) {
  const existing = await TsoModel.findOne({ phone: input.phone });
  if (existing) {
    throw new AppError(409, 'Phone number already registered');
  }

  if (input.email) {
    const existingEmail = await TsoModel.findOne({ email: input.email });
    if (existingEmail) {
      throw new AppError(409, 'Email already registered');
    }
  }

  const tso = await TsoModel.create({
    tsoId: uuidv4(),
    name: input.name,
    email: input.email,
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
    email: tso.email,
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

export async function updateTsoStatus(
  tsoId: string,
  input: UpdateTsoStatusBody,
  actorId: string,
) {
  const tso = await TsoModel.findOne({ tsoId });
  if (!tso) throw new AppError(404, 'TSO not found');

  tso.status = input.status;
  await tso.save();

  await AuditLogModel.create({
    logId: randomUUID(),
    actorId,
    action: 'tso_status_updated',
    targetId: tso.tsoId,
    metadata: { status: input.status },
  });

  return {
    tsoId: tso.tsoId,
    name: tso.name,
    email: tso.email,
    phone: tso.phone,
    deviceId: tso.deviceId,
    assignedAreas: tso.assignedAreas,
    status: tso.status,
    createdAt: tso.createdAt,
  };
}

export async function updateTso(
  tsoId: string,
  input: UpdateTsoBody,
  actorId: string,
) {
  const tso = await TsoModel.findOne({ tsoId });
  if (!tso) throw new AppError(404, 'TSO not found');

  if (input.phone && input.phone !== tso.phone) {
    const existingPhone = await TsoModel.findOne({ phone: input.phone });
    if (existingPhone && existingPhone.tsoId !== tsoId) {
      throw new AppError(409, 'Phone number already registered');
    }
  }

  if (input.email && input.email !== tso.email) {
    const existingEmail = await TsoModel.findOne({ email: input.email });
    if (existingEmail && existingEmail.tsoId !== tsoId) {
      throw new AppError(409, 'Email already registered');
    }
  }

  if (input.name) tso.name = input.name;
  if (input.email) tso.email = input.email;
  if (input.phone) tso.phone = input.phone;
  if (input.password) tso.passwordHash = hashPassword(input.password);
  if (input.status) tso.status = input.status;

  await tso.save();

  await AuditLogModel.create({
    logId: randomUUID(),
    actorId,
    action: 'tso_updated',
    targetId: tso.tsoId,
    metadata: { updatedFields: Object.keys(input) },
  });

  return {
    tsoId: tso.tsoId,
    name: tso.name,
    email: tso.email,
    phone: tso.phone,
    deviceId: tso.deviceId,
    assignedAreas: tso.assignedAreas,
    status: tso.status,
    createdAt: tso.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Admin management functions
// ---------------------------------------------------------------------------

export async function createAdmin(input: CreateAdminBody, actorId: string) {
  const existing = await AdminModel.findOne({ email: input.email });
  if (existing) {
    throw new AppError(409, 'Email already registered');
  }

  const existingPhone = await AdminModel.findOne({ phone: input.phone });
  if (existingPhone) {
    throw new AppError(409, 'Phone number already registered');
  }

  const admin = await AdminModel.create({
    adminId: uuidv4(),
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: hashPassword(input.password),
    role: input.role,
    status: 'active',
  });

  await AuditLogModel.create({
    logId: randomUUID(),
    actorId,
    action: 'admin_created',
    targetId: admin.adminId,
    metadata: { email: admin.email, role: admin.role },
  });

  return {
    adminId: admin.adminId,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    status: admin.status,
    createdAt: admin.createdAt,
  };
}

export async function listAdmins() {
  return AdminModel.find({}, {
    _id: 0,
    __v: 0,
    passwordHash: 0,
    updatedAt: 0,
  }).sort({ createdAt: -1 });
}

export async function getAdmin(adminId: string) {
  const admin = await AdminModel.findOne({ adminId });
  if (!admin) throw new AppError(404, 'Admin not found');

  return {
    adminId: admin.adminId,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    status: admin.status,
    createdAt: admin.createdAt,
  };
}

export async function updateAdminRole(
  adminId: string,
  input: UpdateAdminRoleBody,
  actorId: string,
) {
  const admin = await AdminModel.findOne({ adminId });
  if (!admin) throw new AppError(404, 'Admin not found');

  admin.role = input.role;
  await admin.save();

  await AuditLogModel.create({
    logId: randomUUID(),
    actorId,
    action: 'admin_role_updated',
    targetId: admin.adminId,
    metadata: { oldRole: admin.role, newRole: input.role },
  });

  return {
    adminId: admin.adminId,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    status: admin.status,
    createdAt: admin.createdAt,
  };
}

export async function updateAdminStatus(
  adminId: string,
  input: UpdateAdminStatusBody,
  actorId: string,
) {
  const admin = await AdminModel.findOne({ adminId });
  if (!admin) throw new AppError(404, 'Admin not found');

  admin.status = input.status;
  await admin.save();

  await AuditLogModel.create({
    logId: randomUUID(),
    actorId,
    action: 'admin_status_updated',
    targetId: admin.adminId,
    metadata: { status: input.status },
  });

  return {
    adminId: admin.adminId,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    status: admin.status,
    createdAt: admin.createdAt,
  };
}

export async function updateAdmin(
  adminId: string,
  input: UpdateAdminBody,
  actorId: string,
) {
  const admin = await AdminModel.findOne({ adminId });
  if (!admin) throw new AppError(404, 'Admin not found');

  if (input.email && input.email !== admin.email) {
    const existingEmail = await AdminModel.findOne({ email: input.email });
    if (existingEmail && existingEmail.adminId !== adminId) {
      throw new AppError(409, 'Email already registered');
    }
  }

  if (input.phone && input.phone !== admin.phone) {
    const existingPhone = await AdminModel.findOne({ phone: input.phone });
    if (existingPhone && existingPhone.adminId !== adminId) {
      throw new AppError(409, 'Phone number already registered');
    }
  }

  if (input.name) admin.name = input.name;
  if (input.email) admin.email = input.email;
  if (input.phone) admin.phone = input.phone;
  if (input.role) admin.role = input.role;
  if (input.status) admin.status = input.status;
  if (input.password) admin.passwordHash = hashPassword(input.password);

  await admin.save();

  await AuditLogModel.create({
    logId: randomUUID(),
    actorId,
    action: 'admin_updated',
    targetId: admin.adminId,
    metadata: {
      updatedFields: Object.keys(input),
    },
  });

  return {
    adminId: admin.adminId,
    name: admin.name,
    email: admin.email,
    phone: admin.phone,
    role: admin.role,
    status: admin.status,
    createdAt: admin.createdAt,
  };
}
