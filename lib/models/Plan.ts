import mongoose, { Schema, Model } from 'mongoose';
import { PlanTier } from '../types';

export interface IPlanDoc {
  id: PlanTier;
  name: string;
  price: number;
  period: 'month' | 'year';
  dailyRequestLimit: number;
  allowedModels: string[];
  maxUploadMb: number;
  features: string[];
  badge?: string;
  description: string;
  popular?: boolean;
  priorityProcessing?: boolean;
  teamSeats?: number;
}

const PlanSchema = new Schema<IPlanDoc>(
  {
    id: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    period: { type: String, default: 'month' },
    dailyRequestLimit: { type: Number, required: true },
    allowedModels: [{ type: String }],
    maxUploadMb: { type: Number, default: 10 },
    features: [{ type: String }],
    badge: { type: String },
    description: { type: String, required: true },
    popular: { type: Boolean, default: false },
    priorityProcessing: { type: Boolean, default: false },
    teamSeats: { type: Number },
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

export const PlanModel: Model<IPlanDoc> =
  mongoose.models.Plan || mongoose.model<IPlanDoc>('Plan', PlanSchema);
