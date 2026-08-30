import mongoose, { Schema, Model } from 'mongoose';

export interface IApiKeyDoc {
  id: string;
  key: string;
  userId: string;
  userEmail: string;
  name: string;
  createdAt: Date;
  lastUsedAt?: Date;
  totalCalls: number;
  status: 'active' | 'revoked';
}

const ApiKeyCollectionSchema = new Schema<IApiKeyDoc>(
  {
    id: { type: String, required: true, unique: true, index: true },
    key: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true },
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date },
    totalCalls: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'revoked'], default: 'active', index: true },
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

export const ApiKeyModel: Model<IApiKeyDoc> =
  mongoose.models.ApiKey || mongoose.model<IApiKeyDoc>('ApiKey', ApiKeyCollectionSchema);
