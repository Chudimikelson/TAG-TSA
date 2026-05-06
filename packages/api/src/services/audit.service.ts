import { v4 as uuidv4 } from 'uuid';
import { AuditLogModel } from '../models/AuditLog.js';
import { logger } from '../lib/logger.js';

export interface AuditEntry {
  actorId: string;
  action: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Writes an audit log entry. Failures are logged but never thrown —
 * audit logging must not break the main request flow.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await AuditLogModel.create({
      logId: uuidv4(),
      ...entry,
      timestamp: new Date(),
    });
  } catch (err) {
    logger.error('Failed to write audit log', { entry, err });
  }
}
