import mongoose, { Schema, Document } from 'mongoose';

export interface AdminDocument extends Document {
  adminId: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<AdminDocument>(
  {
    adminId: { type: String, required: true, unique: true, index: true },
    name:    { type: String, required: true, trim: true },
    email:   { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

export const AdminModel = mongoose.model<AdminDocument>('Admin', AdminSchema);
