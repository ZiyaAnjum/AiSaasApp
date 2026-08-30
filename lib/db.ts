import { connectToDatabase } from './mongodb';
import { UserModel } from './models/User';
import { PlanModel } from './models/Plan';
import { ToolModel } from './models/Tool';
import { PromptHistoryModel } from './models/PromptHistory';
import { SubscriptionModel } from './models/Subscription';
import { ApiKeyModel } from './models/ApiKey';
import { DEFAULT_PLANS, DEFAULT_TOOLS } from './constants';
import bcrypt from 'bcryptjs';

let isSeeded = false;

export async function getDb() {
  await connectToDatabase();

  if (!isSeeded) {
    await seedInitialDataIfNeeded();
    isSeeded = true;
  }

  return {
    User: UserModel,
    Plan: PlanModel,
    Tool: ToolModel,
    PromptHistory: PromptHistoryModel,
    Subscription: SubscriptionModel,
    ApiKey: ApiKeyModel,
  };
}

async function seedInitialDataIfNeeded() {
  try {
    // 1. Seed Plans
    const planCount = await PlanModel.countDocuments();
    if (planCount === 0) {
      console.log('[MongoDB] Seeding initial plans...');
      for (const p of DEFAULT_PLANS) {
        await PlanModel.updateOne({ id: p.id }, { $set: p }, { upsert: true });
      }
    }

    // 2. Seed Tools
    const toolCount = await ToolModel.countDocuments();
    if (toolCount === 0) {
      console.log('[MongoDB] Seeding initial tools...');
      for (const t of DEFAULT_TOOLS) {
        await ToolModel.updateOne({ id: t.id }, { $set: t }, { upsert: true });
      }
    }

    // 3. Seed Demo Users if no users exist
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log('[MongoDB] Seeding initial demo users...');
      const adminPassHash = bcrypt.hashSync('Admin@123', 10);
      const userPassHash = bcrypt.hashSync('User@123', 10);

      const demoUsers = [
        {
          id: 'usr_admin',
          name: 'Alex Rivera (Admin)',
          email: 'admin@aisaas.com',
          passwordHash: adminPassHash,
          role: 'admin' as const,
          status: 'active' as const,
          planId: 'enterprise' as const,
          createdAt: new Date('2025-01-01T00:00:00Z'),
          lastLoginAt: new Date(),
          apiKeys: [
            {
              id: 'key_admin_primary',
              key: 'sk_live_enterprise_7f9a8b2c4e1d6h3j5k9m2n4p8q1r5t7v',
              name: 'Production Server Key',
              createdAt: new Date('2025-01-10T12:00:00Z'),
              lastUsedAt: new Date(),
              totalCalls: 4892,
              status: 'active' as const,
            },
          ],
        },
        {
          id: 'usr_pro',
          name: 'Sarah Chen (Pro User)',
          email: 'pro@example.com',
          passwordHash: userPassHash,
          role: 'user' as const,
          status: 'active' as const,
          planId: 'pro' as const,
          createdAt: new Date('2025-01-15T00:00:00Z'),
          lastLoginAt: new Date(),
          apiKeys: [
            {
              id: 'key_pro_dev',
              key: 'sk_live_pro_99a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4',
              name: 'CLI & VS Code Extension',
              createdAt: new Date('2025-02-01T08:30:00Z'),
              lastUsedAt: new Date(),
              totalCalls: 620,
              status: 'active' as const,
            },
          ],
        },
        {
          id: 'usr_starter',
          name: 'David Miller (Starter)',
          email: 'starter@example.com',
          passwordHash: userPassHash,
          role: 'user' as const,
          status: 'active' as const,
          planId: 'starter' as const,
          createdAt: new Date('2025-02-01T00:00:00Z'),
          lastLoginAt: new Date(),
          apiKeys: [
            {
              id: 'key_starter_test',
              key: 'sk_live_starter_1234567890abcdef1234567890abcdef',
              name: 'Staging Environment Key',
              createdAt: new Date('2025-02-05T10:00:00Z'),
              lastUsedAt: new Date(),
              totalCalls: 84,
              status: 'active' as const,
            },
          ],
        },
        {
          id: 'usr_free',
          name: 'Emma Watson (Free)',
          email: 'free@example.com',
          passwordHash: userPassHash,
          role: 'user' as const,
          status: 'active' as const,
          planId: 'free' as const,
          createdAt: new Date('2025-02-10T00:00:00Z'),
          lastLoginAt: new Date(),
          apiKeys: [],
        },
      ];

      for (const u of demoUsers) {
        await UserModel.create(u);
        for (const k of u.apiKeys) {
          await ApiKeyModel.create({
            id: k.id,
            key: k.key,
            userId: u.id,
            userEmail: u.email,
            name: k.name,
            createdAt: k.createdAt,
            lastUsedAt: k.lastUsedAt,
            totalCalls: k.totalCalls,
            status: k.status,
          });
        }
        await SubscriptionModel.create({
          id: `sub_${u.id}`,
          userId: u.id,
          planId: u.planId,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        });
      }

      // Initial sample history log
      await PromptHistoryModel.create({
        id: 'log_seed_1',
        userId: 'usr_pro',
        userEmail: 'pro@example.com',
        toolId: 'ai-chat',
        toolName: 'AI Chat Assistant',
        prompt: 'Explain the core advantages of using Next.js App Router with server-side AI proxy.',
        response: '1. Zero API key leakage to browser clients\n2. Built-in rate limiting and quota enforcement\n3. Streaming response capabilities with SSE\n4. Centralized telemetry, token tracking, and caching.',
        model: 'Gemini 3.7 Flash',
        tokensUsed: { promptTokens: 35, completionTokens: 98, totalTokens: 133 },
        latencyMs: 380,
        date: new Date(),
        isFavorite: true,
        source: 'web',
      });
    }
  } catch (err) {
    console.error('[MongoDB] Error during initial seed check:', err);
  }
}
