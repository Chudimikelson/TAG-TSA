import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.NODE_ENV = 'test';

vi.mock('../models/Tso.js', () => ({
  TsoModel: { findOne: vi.fn() },
}));

vi.mock('../models/Collection.js', () => ({
  CollectionModel: { distinct: vi.fn() },
}));

vi.mock('../models/Member.js', () => ({
  MemberModel: { find: vi.fn(), distinct: vi.fn() },
}));

vi.mock('../models/AuditLog.js', () => ({
  AuditLogModel: { distinct: vi.fn() },
}));

vi.mock('../models/SavingsPlan.js', () => ({
  SavingsPlanModel: { find: vi.fn() },
}));

import { getTsoAssignments } from '../services/tso.service.js';
import { TsoModel } from '../models/Tso.js';
import { CollectionModel } from '../models/Collection.js';
import { MemberModel } from '../models/Member.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { SavingsPlanModel } from '../models/SavingsPlan.js';
import { AppError } from '../middleware/errorHandler.js';

describe('tso.service > getTsoAssignments', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('throws 403 when TSO requests another TSO\'s assignments', async () => {
    await expect(getTsoAssignments('tso-other', 'tso-mine', 'tso')).rejects.toThrow(AppError);
  });

  it('throws 404 when TSO not found', async () => {
    vi.mocked(TsoModel.findOne).mockResolvedValueOnce(null);
    await expect(getTsoAssignments('tso-1', 'tso-1', 'tso')).rejects.toThrow(AppError);
  });

  it('returns empty array when TSO has no collections', async () => {
    vi.mocked(TsoModel.findOne).mockResolvedValueOnce({ tsoId: 'tso-1' } as never);
    vi.mocked(CollectionModel.distinct).mockResolvedValueOnce([]);
    vi.mocked(MemberModel.distinct).mockResolvedValueOnce([]);
    vi.mocked(AuditLogModel.distinct).mockResolvedValueOnce([]);

    const result = await getTsoAssignments('tso-1', 'tso-1', 'tso');
    expect(result).toEqual([]);
  });

  it('returns members with their active plans', async () => {
    vi.mocked(TsoModel.findOne).mockResolvedValueOnce({ tsoId: 'tso-1' } as never);
    vi.mocked(CollectionModel.distinct).mockResolvedValueOnce(['member-1', 'member-2']);
    vi.mocked(MemberModel.distinct).mockResolvedValueOnce([]);
    vi.mocked(AuditLogModel.distinct).mockResolvedValueOnce([]);
    vi.mocked(MemberModel.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([
        { memberId: 'member-1', name: 'Alice' },
        { memberId: 'member-2', name: 'Bob' },
      ]),
    } as never);
    vi.mocked(SavingsPlanModel.find).mockReturnValueOnce({
      lean: vi.fn().mockResolvedValue([
        { planId: 'plan-1', memberId: 'member-1', status: 'active' },
      ]),
    } as never);

    const result = await getTsoAssignments('tso-1', 'tso-1', 'tso');
    expect(result).toHaveLength(2);
    expect(result[0].member.memberId).toBe('member-1');
    expect(result[0].activePlans).toHaveLength(1);
    expect(result[0].activePlan?.planId).toBe('plan-1');
    expect(result[1].member.memberId).toBe('member-2');
    expect(result[1].activePlans).toHaveLength(0);
    expect(result[1].activePlan).toBeNull();
  });

  it('allows admin to view any TSO\'s assignments', async () => {
    vi.mocked(TsoModel.findOne).mockResolvedValueOnce({ tsoId: 'tso-1' } as never);
    vi.mocked(CollectionModel.distinct).mockResolvedValueOnce([]);
    vi.mocked(MemberModel.distinct).mockResolvedValueOnce([]);
    vi.mocked(AuditLogModel.distinct).mockResolvedValueOnce([]);

    const result = await getTsoAssignments('tso-1', 'admin-1', 'admin');
    expect(result).toEqual([]);
  });
});
