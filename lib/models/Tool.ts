import mongoose, { Schema, Model } from 'mongoose';
import { PlanTier } from '../types';

export interface IToolDoc {
  id: string;
  name: string;
  description: string;
  category: 'chat' | 'coding' | 'writing' | 'image' | 'analysis' | 'productivity';
  minPlan: PlanTier;
  systemPrompt: string;
  iconName: string;
  inputPlaceholder: string;
  samplePrompts: string[];
  enabled: boolean;
  availableModels: string[];
}

const ToolSchema = new Schema<IToolDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['chat', 'coding', 'writing', 'image', 'analysis', 'productivity'],
      default: 'productivity',
    },
    minPlan: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },
    systemPrompt: { type: String, required: true },
    iconName: { type: String, default: 'Wrench' },
    inputPlaceholder: { type: String, default: 'Enter input...' },
    samplePrompts: [{ type: String }],
    enabled: { type: Boolean, default: true, index: true },
    availableModels: [{ type: String }],
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

export const ToolModel: Model<IToolDoc> =
  mongoose.models.Tool || mongoose.model<IToolDoc>('Tool', ToolSchema);
