import { AppError } from '../middleware/errorHandler.js';
import { AuditLogModel } from '../models/AuditLog.js';
import { CollectionModel } from '../models/Collection.js';
import { MemberModel } from '../models/Member.js';
import { SavingsPlanModel } from '../models/SavingsPlan.js';
import { TsoModel } from '../models/Tso.js';

export async function getTsoAssignments(
  tsoId: string,
  actorId: string,
  actorRole: string,
) {
  // TSOs may only view their own assignments
  if (actorRole === 'tso' && actorId !== tsoId) {
    throw new AppError(403, 'Forbidden');
  }

  const tso = await TsoModel.findOne({ tsoId });
  if (!tso) throw new AppError(404, 'TSO not found');

  // Distinct memberIds this TSO has collected for
  const collectedMemberIds: string[] = await CollectionModel.distinct('memberId', { tsoId });

  // Also include members directly created by this TSO (before first collection)
  const createdMemberIds: string[] = await MemberModel.distinct('memberId', {
    createdByTsoId: tsoId,
  });

  // Backward compatibility: include members created by this TSO before createdByTsoId existed
  const createdViaAuditIds: string[] = await AuditLogModel.distinct('targetId', {
    actorId: tsoId,
    action: 'member.created',
  });

  const memberIds = Array.from(
    new Set([...collectedMemberIds, ...createdMemberIds, ...createdViaAuditIds]),
  );

  if (memberIds.length === 0) return [];

  const [members, plans] = await Promise.all([
    MemberModel.find({ memberId: { $in: memberIds } }).lean(),
    SavingsPlanModel.find({
      memberId: { $in: memberIds },
      status: 'active',
    }).lean(),
  ]);

  const plansByMember = new Map<string, typeof plans>();
  for (const plan of plans) {
    const bucket = plansByMember.get(plan.memberId) ?? [];
    bucket.push(plan);
    plansByMember.set(plan.memberId, bucket);
  }

  return members.map((m) => {
    const activePlans = plansByMember.get(m.memberId) ?? [];
    return {
      member: m,
      activePlans,
      activePlan: activePlans[0] ?? null,
    };
  });
}
