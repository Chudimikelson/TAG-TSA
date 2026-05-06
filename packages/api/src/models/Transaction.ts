import mongoose, { Schema, Document } from 'mongoose';
import { TransactionMethod, TransactionStatus } from '@tagora/shared';

export interface TransactionDocument extends Document {
  transactionId: string;
  externalRef: string;
  memberId?: string;
  amount: number;
  method: TransactionMethod;
  timestamp: Date;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<TransactionDocument>(
  {
    transactionId: { type: String, required: true, unique: true, index: true },
    externalRef: { type: String, required: true, unique: true, index: true },
    memberId: { type: String, index: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ['transfer', 'ussd'], required: true },
    timestamp: { type: Date, required: true },
    status: {
      type: String,
      enum: ['unmatched', 'matched', 'flagged'],
      default: 'unmatched',
    },
  },
  { timestamps: true },
);

export const TransactionModel = mongoose.model<TransactionDocument>(
  'Transaction',
  TransactionSchema,
);
