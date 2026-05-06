import mongoose, { Schema, Document } from 'mongoose';

export interface AuditLogDocument extends Document {
  logId: string;
  actorId: string;
  action: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    logId: { type: String, required: true, unique: true, index: true },
    actorId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    targetId: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

export const AuditLogModel = mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);
