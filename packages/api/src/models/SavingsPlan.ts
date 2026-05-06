import mongoose, { Schema, Document } from 'mongoose';
import { PlanFrequency, PlanStatus } from '@tagora/shared';

export interface SavingsPlanDocument extends Document {
  planId: string;
  memberId: string;
  name: string;
  amount: number;
  frequency: PlanFrequency;
  startDate: Date;
  nextScheduledDate: Date;
  status: PlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsPlanSchema = new Schema<SavingsPlanDocument>(
  {
    planId: { type: String, required: true, unique: true, index: true },
    memberId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    startDate: { type: Date, required: true },
    nextScheduledDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'paused', 'closed'], default: 'active' },
  },
  { timestamps: true },
);

export const SavingsPlanModel = mongoose.model<SavingsPlanDocument>(
  'SavingsPlan',
  SavingsPlanSchema,
);
