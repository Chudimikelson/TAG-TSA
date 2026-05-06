import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.NODE_ENV = 'test';

vi.mock('../models/Member.js', () => ({
  MemberModel: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../models/SavingsPlan.js', () => ({
  SavingsPlanModel: {
    create: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('../models/AuditLog.js', () => ({
  AuditLogModel: { create: vi.fn().mockResolvedValue({}) },
}));

import { createMember, getMember, createPlan, getMemberPlans } from '../services/member.service.js';
import { MemberModel } from '../models/Member.js';
import { SavingsPlanModel } from '../models/SavingsPlan.js';
import { AppError } from '../middleware/errorHandler.js';

describe('member.service', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // -------------------------------------------------------------------------
  // createMember
  // -------------------------------------------------------------------------
  describe('createMember', () => {
    const input = { name: 'Ada Obi', phone: '+2348000000001', nationalIdRef: 'NIN-123' };

    it('throws 409 when phone already exists', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'existing' } as never);
      await expect(createMember(input, 'admin-1', 'admin')).rejects.toThrow(AppError);
    });

    it('creates and returns a new member', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce(null);
      const created = { memberId: 'member-new', ...input, kycStatus: 'pending' };
      vi.mocked(MemberModel.create).mockResolvedValueOnce(created as never);

      const result = await createMember(input, 'admin-1', 'admin');
      expect(MemberModel.create).toHaveBeenCalledOnce();
      expect(result.memberId).toBe('member-new');
    });
  });

  // -------------------------------------------------------------------------
  // getMember
  // -------------------------------------------------------------------------
  describe('getMember', () => {
    it('throws 404 when member does not exist', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce(null);
      await expect(getMember('member-missing')).rejects.toThrow(AppError);
    });

    it('returns member when found', async () => {
      const member = { memberId: 'member-1', name: 'Ada' };
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce(member as never);
      const result = await getMember('member-1');
      expect(result.memberId).toBe('member-1');
    });
  });

  // -------------------------------------------------------------------------
  // createPlan
  // -------------------------------------------------------------------------
  describe('createPlan', () => {
    const planInput = {
      name: 'Monthly Savings',
      amount: 5000,
      frequency: 'monthly' as const,
      startDate: new Date('2026-06-01'),
    };

    it('throws 404 when member does not exist', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce(null);
      await expect(createPlan('member-missing', planInput, 'admin-1')).rejects.toThrow(AppError);
    });

    it('creates plan with correct nextScheduledDate for monthly frequency', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'member-1' } as never);
      vi.mocked(SavingsPlanModel.create).mockResolvedValueOnce({ planId: 'plan-new' } as never);

      await createPlan('member-1', planInput, 'admin-1');

      const createCall = vi.mocked(SavingsPlanModel.create).mock.calls[0][0] as Record<string, unknown>;
      const next = createCall.nextScheduledDate as Date;
      expect(next.getMonth()).toBe(6); // July (June + 1)
    });

    it('creates plan with correct nextScheduledDate for weekly frequency', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'member-1' } as never);
      vi.mocked(SavingsPlanModel.create).mockResolvedValueOnce({ planId: 'plan-weekly' } as never);

      await createPlan('member-1', { ...planInput, frequency: 'weekly' }, 'admin-1');

      const createCall = vi.mocked(SavingsPlanModel.create).mock.calls[0][0] as Record<string, unknown>;
      const next = createCall.nextScheduledDate as Date;
      // 2026-06-01 + 7 days = 2026-06-08
      expect(next.getDate()).toBe(8);
    });
  });

  // -------------------------------------------------------------------------
  // getMemberPlans
  // -------------------------------------------------------------------------
  describe('getMemberPlans', () => {
    it('throws 404 when member does not exist', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce(null);
      await expect(getMemberPlans('member-missing')).rejects.toThrow(AppError);
    });

    it('returns all plans for a member sorted by createdAt desc', async () => {
      vi.mocked(MemberModel.findOne).mockResolvedValueOnce({ memberId: 'member-1' } as never);
      const plans = [{ planId: 'plan-1' }, { planId: 'plan-2' }];
      vi.mocked(SavingsPlanModel.find).mockReturnValueOnce({
        sort: vi.fn().mockResolvedValueOnce(plans),
      } as never);

      const result = await getMemberPlans('member-1');
      expect(result).toHaveLength(2);
    });
  });
});
