import mongoose, { Schema, Document } from 'mongoose';
import { KycStatus } from '@tagora/shared';

export interface MemberDocument extends Document {
  memberId: string;
  accountNumber: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  branch?: string;
  createdByTsoId?: string;
  nationalIdRef?: string;
  kycStatus: KycStatus;
  savingsBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<MemberDocument>(
  {
    memberId: { type: String, required: true, unique: true, index: true },
    accountNumber: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    branch: { type: String, trim: true, index: true },
    phone: { type: String, unique: true, sparse: true, index: true, trim: true },
    email: { type: String, trim: true },
    createdByTsoId: { type: String, index: true },
    nationalIdRef: { type: String },
    savingsBalance: { type: Number, required: true, default: 0, min: 0 },
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

export const MemberModel = mongoose.model<MemberDocument>('Member', MemberSchema);
