import { v4 as uuidv4 } from 'uuid';
import { WithdrawalRequestModel, WithdrawalRequestDocument } from '../models/WithdrawalRequest.js';
import { MemberModel } from '../models/Member.js';
import { SavingsPlanModel } from '../models/SavingsPlan.js';
import { audit } from './audit.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { CreateWithdrawalBody, ReviewWithdrawalBody } from '../validators/withdrawal.validators.js';

// ---------------------------------------------------------------------------
// Create withdrawal request (TSO on behalf of member)
// ---------------------------------------------------------------------------

export async function createWithdrawal(
  input: CreateWithdrawalBody,
  tsoId: string,
): Promise<WithdrawalRequestDocument> {
  // Verify member exists
  const member = await MemberModel.findOne({ memberId: input.memberId });
  if (!member) {
    throw new AppError(404, 'Member not found');
  }

  if ((member.savingsBalance ?? 0) < input.amount) {
    throw new AppError(409, 'Insufficient savings balance for this withdrawal');
  }

  // Verify plan exists and belongs to the member
  const plan = await SavingsPlanModel.findOne({
    planId: input.planId,
    memberId: input.memberId,
  });
  if (!plan) {
    throw new AppError(404, 'Plan not found for this member');
  }

  if (plan.status !== 'active') {
    throw new AppError(409, 'Withdrawal can only be requested for an active plan');
  }

  // Guard: no duplicate pending withdrawal for the same plan
  const existing = await WithdrawalRequestModel.findOne({
    planId: input.planId,
    status: 'pending',
  });
  if (existing) {
    throw new AppError(409, 'A pending withdrawal already exists for this plan');
  }

  const withdrawalId = uuidv4();

  const withdrawal = await WithdrawalRequestModel.create({
    withdrawalId,
    requesterTsoId: tsoId,
    memberId: input.memberId,
    planId: input.planId,
    amount: input.amount,
    requestedAt: new Date(),
    disbursementMethod: input.disbursementMethod,
    status: 'pending',
  });

  await audit({
    actorId: tsoId,
    action: 'withdrawal.created',
    targetId: withdrawalId,
    metadata: {
      memberId: input.memberId,
      planId: input.planId,
      amount: input.amount,
      disbursementMethod: input.disbursementMethod,
    },
  });

  await MemberModel.updateOne(
    { memberId: input.memberId },
    { $inc: { savingsBalance: -input.amount } },
  );

  return withdrawal;
}

// ---------------------------------------------------------------------------
// List withdrawals (TSO sees own; admin sees all)
// ---------------------------------------------------------------------------

export async function listWithdrawals(
  actorId: string,
  actorRole: string,
): Promise<WithdrawalRequestDocument[]> {
  const filter = actorRole === 'tso' ? { requesterTsoId: actorId } : {};
  return WithdrawalRequestModel.find(filter).sort({ requestedAt: -1 });
}

// ---------------------------------------------------------------------------
// Get withdrawal by id (TSO sees own requests; admin sees all)
// ---------------------------------------------------------------------------

export async function getWithdrawal(
  withdrawalId: string,
  actorId: string,
  actorRole: string,
): Promise<WithdrawalRequestDocument> {
  const withdrawal = await WithdrawalRequestModel.findOne({ withdrawalId });
  if (!withdrawal) {
    throw new AppError(404, 'Withdrawal not found');
  }

  if (actorRole === 'tso' && withdrawal.requesterTsoId !== actorId) {
    throw new AppError(403, 'Access denied');
  }

  return withdrawal;
}

// ---------------------------------------------------------------------------
// Approve or reject (admin only)
// ---------------------------------------------------------------------------

export async function reviewWithdrawal(
  withdrawalId: string,
  input: ReviewWithdrawalBody,
  adminId: string,
): Promise<WithdrawalRequestDocument> {
  const withdrawal = await WithdrawalRequestModel.findOne({ withdrawalId });
  if (!withdrawal) {
    throw new AppError(404, 'Withdrawal not found');
  }

  if (withdrawal.status !== 'pending') {
    throw new AppError(409, `Cannot review a withdrawal that is already '${withdrawal.status}'`);
  }

  withdrawal.status = input.decision;
  withdrawal.approvedBy = adminId;
  withdrawal.approvedAt = new Date();
  await withdrawal.save();

  await audit({
    actorId: adminId,
    action: `withdrawal.${input.decision}`,
    targetId: withdrawalId,
    metadata: { decision: input.decision },
  });

  if (input.decision === 'rejected') {
    await MemberModel.updateOne(
      { memberId: withdrawal.memberId },
      { $inc: { savingsBalance: withdrawal.amount } },
    );
  }

  return withdrawal;
}
