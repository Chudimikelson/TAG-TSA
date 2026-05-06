import mongoose, { Schema, Document } from 'mongoose';

export interface OtpDocument extends Document {
  phone: string;
  code: string;
  expiresAt: Date;
  verified: boolean;
}

const OtpSchema = new Schema<OtpDocument>({
  phone: { type: String, required: true, index: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
});

// Auto-remove expired OTP documents from MongoDB
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel = mongoose.model<OtpDocument>('Otp', OtpSchema);
