import mongoose from 'mongoose';
import { Document } from './document';

export interface IUser {
  userId: string;
  userName: string | null;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
  documents?: Document[]; // Virtual field for documents
}

const userSchema = new mongoose.Schema<IUser>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    userName: {
      type: String,
      trim: true,
      default: null,
    },
    customerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual populate for documents
userSchema.virtual('documents', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'userId'
});

// Create compound indices for common queries
userSchema.index({ customerId: 1, createdAt: -1 });
userSchema.index({ userId: 1 }, { unique: true });

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema); 