import mongoose, { Schema, Document } from 'mongoose';
import { TsoStatus } from '@tagora/shared';

export interface TsoDocument extends Document {
  tsoId: string;
  name: string;
  email?: string;
  phone: string;
  passwordHash: string;
  deviceId: string;
  assignedAreas: string[];
  status: TsoStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TsoSchema = new Schema<TsoDocument>(
  {
    tsoId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    deviceId: { type: String, required: true },
    assignedAreas: { type: [String], default: [] },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  { timestamps: true },
);

export const TsoModel = mongoose.model<TsoDocument>('Tso', TsoSchema);
