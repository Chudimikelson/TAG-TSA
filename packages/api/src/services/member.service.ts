import { v4 as uuidv4 } from 'uuid';
import { MemberModel, MemberDocument } from '../models/Member.js';
import { SavingsPlanModel, SavingsPlanDocument } from '../models/SavingsPlan.js';
import { CollectionModel } from '../models/Collection.js';
import { TsoModel } from '../models/Tso.js';
import { audit } from './audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  CreateMemberBody,
  CreatePlanBody,
  UpdateMemberBody,
  UpdatePlanBody,
} from '../validators/member.validators.js';
import { PlanFrequency } from '@tagora/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeNextScheduledDate(startDate: Date, frequency: PlanFrequency): Date {
  const d = new Date(startDate);
  switch (frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

async function ensureMemberAccess(
  memberId: string,
  actorId: string,
  actorRole: 'admin' | 'tso',
): Promise<MemberDocument> {
  const member = await MemberModel.findOne({ memberId });
  if (!member) {
    throw new AppError(404, 'Member not found');
  }

  if (actorRole === 'admin') {
    return member;
  }

  if (member.createdByTsoId === actorId) {
    return member;
  }

  const hasCollection = await CollectionModel.exists({ memberId, tsoId: actorId });
  if (!hasCollection) {
    throw new AppError(403, 'You can only update assigned members');
  }

  return member;
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function createMember(
  input: CreateMemberBody,
  actorId: string,
  actorRole: 'admin' | 'tso',
): Promise<MemberDocument> {
  if (input.phone) {
    const existing = await MemberModel.findOne({ phone: input.phone });
    if (existing) {
      throw new AppError(409, 'A member with this phone number already exists');
    }
  }

  const memberId = uuidv4();
  const accountNumber = input.accountNumber ?? `ACC-${memberId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  const member = await MemberModel.create({
    memberId,
    accountNumber,
    name: input.name,
    phone: input.phone,
    email: input.email,
    address: input.address,
    branch: input.branch,
    createdByTsoId: actorRole === 'tso' ? actorId : undefined,
    nationalIdRef: input.nationalIdRef,
    savingsBalance: 0,
    kycStatus: 'pending',
  });

  await audit({
    actorId,
    action: 'member.created',
    targetId: memberId,
    metadata: { phone: input.phone, name: input.name },
  });

  return member;
}

export async function listMembers(
  actorId: string,
  actorRole: 'admin' | 'tso',
) {
  let members: MemberDocument[];
  if (actorRole === 'admin') {
    members = await MemberModel.find({}).sort({ createdAt: -1 });
  } else {
    const collectedMemberIds: string[] = await CollectionModel.distinct('memberId', {
      tsoId: actorId,
    });

    members = await MemberModel.find({
      $or: [
        { createdByTsoId: actorId },
        { memberId: { $in: collectedMemberIds } },
      ],
    }).sort({ createdAt: -1 });
  }

  // Resolve TSO names
  const tsoIds = [...new Set(members.map((m) => m.createdByTsoId).filter(Boolean) as string[])];
  const tsos = tsoIds.length
    ? await TsoModel.find({ tsoId: { $in: tsoIds } }).select('tsoId name')
    : [];
  const tsoMap = new Map(tsos.map((t) => [t.tsoId, t.name]));

  return members.map((m) => ({
    ...m.toObject(),
    tsoName: m.createdByTsoId ? (tsoMap.get(m.createdByTsoId) ?? '—') : '—',
  }));
}

export async function getMember(memberId: string): Promise<MemberDocument> {
  const member = await MemberModel.findOne({ memberId });
  if (!member) {
    throw new AppError(404, 'Member not found');
  }
  return member;
}

export async function updateMember(
  memberId: string,
  input: UpdateMemberBody,
  actorId: string,
  actorRole: 'admin' | 'tso',
): Promise<MemberDocument> {
  const member = await ensureMemberAccess(memberId, actorId, actorRole);

  if (input.phone && input.phone !== member.phone) {
    const existingPhone = await MemberModel.findOne({ phone: input.phone });
    if (existingPhone && existingPhone.memberId !== member.memberId) {
      throw new AppError(409, 'A member with this phone number already exists');
    }
  }

  if (input.accountNumber && input.accountNumber !== member.accountNumber) {
    const existingAccount = await MemberModel.findOne({ accountNumber: input.accountNumber });
    if (existingAccount && existingAccount.memberId !== member.memberId) {
      throw new AppError(409, 'A member with this account number already exists');
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'phone')) {
    member.phone = input.phone;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'address')) {
    member.address = input.address;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'accountNumber') && input.accountNumber) {
    member.accountNumber = input.accountNumber;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'nationalIdRef') && input.nationalIdRef) {
    member.nationalIdRef = input.nationalIdRef;
  }

  await member.save();

  await audit({
    actorId,
    action: 'member.updated',
    targetId: memberId,
    metadata: {
      updatedFields: Object.keys(input),
    },
  });

  return member;
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export async function createPlan(
  memberId: string,
  input: CreatePlanBody,
  actorId: string,
): Promise<SavingsPlanDocument> {
  // Verify the member exists
  const member = await MemberModel.findOne({ memberId });
  if (!member) {
    throw new AppError(404, 'Member not found');
  }

  const planId = uuidv4();
  const nextScheduledDate = computeNextScheduledDate(input.startDate, input.frequency);

  const plan = await SavingsPlanModel.create({
    planId,
    memberId,
    name: input.name,
    amount: input.amount,
    frequency: input.frequency,
    startDate: input.startDate,
    nextScheduledDate,
    status: 'active',
  });

  await audit({
    actorId,
    action: 'plan.created',
    targetId: planId,
    metadata: { memberId, amount: input.amount, frequency: input.frequency },
  });

  return plan;
}

export async function getMemberPlans(memberId: string): Promise<SavingsPlanDocument[]> {
  const member = await MemberModel.findOne({ memberId });
  if (!member) {
    throw new AppError(404, 'Member not found');
  }

  return SavingsPlanModel.find({ memberId }).sort({ createdAt: -1 });
}

export async function updateMemberPlan(
  memberId: string,
  planId: string,
  input: UpdatePlanBody,
  actorId: string,
  actorRole: 'admin' | 'tso',
): Promise<SavingsPlanDocument> {
  await ensureMemberAccess(memberId, actorId, actorRole);

  const plan = await SavingsPlanModel.findOne({ memberId, planId });
  if (!plan) {
    throw new AppError(404, 'Savings plan not found');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'name') && input.name) {
    plan.name = input.name;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'amount') && typeof input.amount === 'number') {
    plan.amount = input.amount;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'frequency') && input.frequency) {
    plan.frequency = input.frequency;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'startDate') && input.startDate) {
    plan.startDate = input.startDate;
  }

  if (
    Object.prototype.hasOwnProperty.call(input, 'frequency') ||
    Object.prototype.hasOwnProperty.call(input, 'startDate')
  ) {
    plan.nextScheduledDate = computeNextScheduledDate(plan.startDate, plan.frequency);
  }

  await plan.save();

  await audit({
    actorId,
    action: 'plan.updated',
    targetId: planId,
    metadata: {
      memberId,
      updatedFields: Object.keys(input),
    },
  });

  return plan;
}
