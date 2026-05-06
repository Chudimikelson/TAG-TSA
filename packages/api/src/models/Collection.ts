import mongoose, { Schema, Document } from 'mongoose';
import { CollectionMethod, CollectionStatus } from '@tagora/shared';

export interface CollectionDocument extends Document {
  collectionId: string;
  planId: string;
  memberId: string;
  tsoId: string;
  amount: number;
  method: CollectionMethod;
  timestamp: Date;
  photoReceiptUrl?: string;
  geo?: { lat: number; lng: number };
  matchedTransactionId?: string;
  status: CollectionStatus;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<CollectionDocument>(
  {
    collectionId: { type: String, required: true, unique: true, index: true },
    planId: { type: String, required: true, index: true },
    memberId: { type: String, required: true, index: true },
    tsoId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ['cash', 'tsa', 'tagora_pool'], required: true },
    timestamp: { type: Date, required: true },
    photoReceiptUrl: { type: String },
    geo: {
      lat: { type: Number },
      lng: { type: Number },
    },
    matchedTransactionId: { type: String },
    status: {
      type: String,
      enum: ['pending', 'matched', 'flagged', 'reconciled'],
      default: 'pending',
    },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
  },
  { timestamps: true },
);

export const CollectionModel = mongoose.model<CollectionDocument>('Collection', CollectionSchema);
