import mongoose, { Schema, Document } from 'mongoose';

export type AdminRole = 'SuperAdmin' | 'CSM' | 'HOP' | 'TeamLead' | 'Fincon';
export type AdminStatus = 'active' | 'suspended';

export interface AdminDocument extends Document {
  adminId: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<AdminDocument>(
  {
    adminId: { type: String, required: true, unique: true, index: true },
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone:   { type: String, trim: true, unique: true, sparse: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['SuperAdmin', 'CSM', 'HOP', 'TeamLead', 'Fincon'], default: 'CSM' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  },
  { timestamps: true },
);

export const AdminModel = mongoose.model<AdminDocument>('Admin', AdminSchema);
