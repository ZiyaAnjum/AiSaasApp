import mongoose, { Schema, Model } from 'mongoose';

export interface IPromptHistory {
  id: string;
  userId: string;
  userEmail: string;
  toolId: string;
  toolName: string;
  prompt: string;
  response: string;
  model: string;
  tokensUsed: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  date: Date;
  isFavorite: boolean;
  source: 'web' | 'api';
  apiKeyId?: string;
  tags?: string[];
  workspace?: string;
  isArena?: boolean;
  arenaModelB?: string;
  arenaResponseB?: string;
  arenaWinner?: 'modelA' | 'modelB' | 'tie';
}

const PromptHistorySchema = new Schema<IPromptHistory>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, index: true },
    toolId: { type: String, required: true, index: true },
    toolName: { type: String, required: true },
    prompt: { type: String, required: true },
    response: { type: String, required: true },
    model: { type: String, required: true },
    tokensUsed: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    latencyMs: { type: Number, default: 0 },
    date: { type: Date, default: Date.now, index: true },
    isFavorite: { type: Boolean, default: false, index: true },
    source: { type: String, enum: ['web', 'api'], default: 'web', index: true },
    apiKeyId: { type: String, index: true },
    tags: { type: [String], default: [] },
    workspace: { type: String, default: 'Default' },
    isArena: { type: Boolean, default: false },
    arenaModelB: { type: String },
    arenaResponseB: { type: String },
    arenaWinner: { type: String, enum: ['modelA', 'modelB', 'tie'] },
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

PromptHistorySchema.index({ userId: 1, date: -1 });

export const PromptHistoryModel: Model<IPromptHistory> =
  mongoose.models.PromptHistory ||
  mongoose.model<IPromptHistory>('PromptHistory', PromptHistorySchema);
