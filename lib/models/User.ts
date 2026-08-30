import mongoose, { Schema, Model } from 'mongoose';
import { PlanTier, UserRole, UserStatus } from '../types';

export interface IApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: Date;
  lastUsedAt?: Date;
  totalCalls: number;
  status: 'active' | 'revoked';
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  planId: PlanTier;
  createdAt: Date;
  lastLoginAt?: Date;
  apiKeys: IApiKey[];
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    id: { type: String, required: true },
    key: { type: String, required: true, index: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date },
    totalCalls: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    status: { type: String, enum: ['active', 'blocked'], default: 'active', index: true },
    planId: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
      index: true,
    },
    createdAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date },
    apiKeys: [ApiKeySchema],
  },
  {
    timestamps: false,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
