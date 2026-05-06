import mongoose, { Schema, Document } from 'mongoose';
import { WithdrawalStatus, DisbursementMethod } from '@tagora/shared';

export interface WithdrawalRequestDocument extends Document {
  withdrawalId: string;
  requesterTsoId: string;
  memberId: string;
  planId: string;
  amount: number;
  requestedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  status: WithdrawalStatus;
  disbursementMethod: DisbursementMethod;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalRequestSchema = new Schema<WithdrawalRequestDocument>(
  {
    withdrawalId: { type: String, required: true, unique: true, index: true },
    requesterTsoId: { type: String, required: true, index: true },
    memberId: { type: String, required: true, index: true },
    planId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    requestedAt: { type: Date, required: true, default: Date.now },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'disbursed'],
      default: 'pending',
    },
    disbursementMethod: {
      type: String,
      enum: ['bank_transfer', 'cash', 'mobile_money'],
      required: true,
    },
  },
  { timestamps: true },
);

export const WithdrawalRequestModel = mongoose.model<WithdrawalRequestDocument>(
  'WithdrawalRequest',
  WithdrawalRequestSchema,
);
