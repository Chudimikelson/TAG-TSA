import mongoose, { Schema, Document } from 'mongoose';

export interface ReconciliationRecordDocument extends Document {
  reconId: string;
  date: Date;
  expectedTotal: number;
  cashCounted: number;
  transfersTotal: number;
  variance: number;
  resolvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReconciliationRecordSchema = new Schema<ReconciliationRecordDocument>(
  {
    reconId: { type: String, required: true, unique: true, index: true },
    date: { type: Date, required: true, index: true },
    expectedTotal: { type: Number, required: true },
    cashCounted: { type: Number, required: true },
    transfersTotal: { type: Number, required: true },
    variance: { type: Number, required: true },
    resolvedBy: { type: String },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

export const ReconciliationRecordModel = mongoose.model<ReconciliationRecordDocument>(
  'ReconciliationRecord',
  ReconciliationRecordSchema,
);
