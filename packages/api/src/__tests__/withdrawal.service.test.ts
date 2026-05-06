import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.NODE_ENV = 'test';

vi.mock('../models/WithdrawalRequest.js', () => ({
  WithdrawalRequestModel: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../models/Member.js', () => ({
  MemberModel: { findOne: vi.fn(), updateOne: vi.fn().mockResolvedValue({}) },
}));

vi.mock('../models/SavingsPlan.js', () => ({
  SavingsPlanModel: { findOne: vi.fn() },
}));

vi.mock('../models/AuditLog.js', () => ({
  AuditLogModel: { create: vi.fn().mockResolvedValue({}) },
}));

import { createWithdrawal, getWithdrawal, reviewWithdrawal } from '../services/withdrawal.service.js';
import { WithdrawalRequestModel } from '../models/WithdrawalRequest.js';
import { MemberModel } from '../models/Member.js';
import { SavingsPlanModel } from '../models/SavingsPlan.js';
import { AppError } from '../middleware/errorHandler.js';

const baseInput = {
  memberId: 'member-1',
  planId: 'plan-1',
  amount: 10000,
  disbursementMethod: 'bank_transfer' as const,
};

describe('withdrawal.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // -------------------------------------------------------------------------
  // createWithdrawal
  // -------------------------------------------------------------------------
  describe('createWithdrawal', () => {
    it('throws 404 when member not found', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce(null);
      await expect(createWithdrawal(baseInput, 'tso-1')).rejects.toThrow(AppError);
    });

    it('throws 404 when plan not found for member', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'member-1', savingsBalance: 50000 } as never);
      vi.mocked(SavingsPlanModel.findOne).mockResolvedValueOnce(null);
      await expect(createWithdrawal(baseInput, 'tso-1')).rejects.toThrow(AppError);
    });

    it('throws 409 when plan is not active', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'member-1', savingsBalance: 50000 } as never);
      vi.mocked(SavingsPlanModel.findOne).mockResolvedValueOnce({ planId: 'plan-1', status: 'paused' } as never);
      await expect(createWithdrawal(baseInput, 'tso-1')).rejects.toThrow(AppError);
    });

    it('throws 409 when a pending withdrawal already exists for the plan', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'member-1', savingsBalance: 50000 } as never);
      vi.mocked(SavingsPlanModel.findOne).mockResolvedValueOnce({ planId: 'plan-1', status: 'active' } as never);
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce({ withdrawalId: 'w-existing' } as never);
      await expect(createWithdrawal(baseInput, 'tso-1')).rejects.toThrow(AppError);
    });

    it('throws 409 when withdrawal amount exceeds savings balance', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'member-1', savingsBalance: 1000 } as never);
      vi.mocked(SavingsPlanModel.findOne).mockResolvedValueOnce({ planId: 'plan-1', status: 'active' } as never);
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce(null);
      await expect(createWithdrawal(baseInput, 'tso-1')).rejects.toThrow(AppError);
    });

    it('creates and returns withdrawal when all guards pass', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'member-1', savingsBalance: 50000 } as never);
      vi.mocked(SavingsPlanModel.findOne).mockResolvedValueOnce({ planId: 'plan-1', status: 'active' } as never);
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce(null);
      vi.mocked(WithdrawalRequestModel.create).mockResolvedValueOnce({ withdrawalId: 'w-new', status: 'pending' } as never);

      const result = await createWithdrawal(baseInput, 'tso-1');
      expect(WithdrawalRequestModel.create).toHaveBeenCalledOnce();
      expect(result.withdrawalId).toBe('w-new');
    });
  });

  // -------------------------------------------------------------------------
  // getWithdrawal
  // -------------------------------------------------------------------------
  describe('getWithdrawal', () => {
    it('throws 404 when not found', async () => {
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce(null);
      await expect(getWithdrawal('w-missing', 'tso-1', 'tso')).rejects.toThrow(AppError);
    });

    it('throws 403 when TSO requests another TSO\'s withdrawal', async () => {
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce({
        withdrawalId: 'w-1',
        requesterTsoId: 'tso-other',
      } as never);
      await expect(getWithdrawal('w-1', 'tso-1', 'tso')).rejects.toThrow(AppError);
    });

    it('allows admin to read any withdrawal', async () => {
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce({
        withdrawalId: 'w-1',
        requesterTsoId: 'tso-other',
      } as never);
      const result = await getWithdrawal('w-1', 'admin-1', 'admin');
      expect(result.withdrawalId).toBe('w-1');
    });

    it('allows TSO to read their own withdrawal', async () => {
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce({
        withdrawalId: 'w-1',
        requesterTsoId: 'tso-1',
      } as never);
      const result = await getWithdrawal('w-1', 'tso-1', 'tso');
      expect(result.withdrawalId).toBe('w-1');
    });
  });

  // -------------------------------------------------------------------------
  // reviewWithdrawal
  // -------------------------------------------------------------------------
  describe('reviewWithdrawal', () => {
    it('throws 404 when withdrawal not found', async () => {
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce(null);
      await expect(reviewWithdrawal('w-missing', { decision: 'approved' }, 'admin-1')).rejects.toThrow(AppError);
    });

    it('throws 409 when withdrawal is not pending', async () => {
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce({
        withdrawalId: 'w-1',
        status: 'approved',
        save: vi.fn(),
      } as never);
      await expect(reviewWithdrawal('w-1', { decision: 'rejected' }, 'admin-1')).rejects.toThrow(AppError);
    });

    it('approves a pending withdrawal and sets approvedBy/approvedAt', async () => {
      const save = vi.fn().mockResolvedValue({});
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce({
        withdrawalId: 'w-1',
        status: 'pending',
        save,
      } as never);

      const result = await reviewWithdrawal('w-1', { decision: 'approved' }, 'admin-1');
      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe('admin-1');
      expect(result.approvedAt).toBeInstanceOf(Date);
      expect(save).toHaveBeenCalledOnce();
    });

    it('rejects a pending withdrawal', async () => {
      const save = vi.fn().mockResolvedValue({});
      vi.mocked(WithdrawalRequestModel.findOne).mockResolvedValueOnce({
        withdrawalId: 'w-1',
        status: 'pending',
        save,
      } as never);

      const result = await reviewWithdrawal('w-1', { decision: 'rejected' }, 'admin-1');
      expect(result.status).toBe('rejected');
      expect(save).toHaveBeenCalledOnce();
    });
  });
});
