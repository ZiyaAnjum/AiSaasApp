import mongoose, { Schema, Model } from 'mongoose';
import { PlanTier } from '../types';

export interface ISubscription {
  id: string;
  userId: string;
  planId: PlanTier;
  status: 'active' | 'cancelled' | 'past_due';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, unique: true, index: true },
    planId: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      required: true,
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due'],
      default: 'active',
      index: true,
    },
    currentPeriodStart: { type: Date, default: Date.now },
    currentPeriodEnd: { type: Date, required: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
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

export const SubscriptionModel: Model<ISubscription> =
  mongoose.models.Subscription ||
  mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
