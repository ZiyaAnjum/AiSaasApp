import bcrypt from 'bcryptjs';
import { User, Plan, Tool, AiRequestLog, Subscription } from './types';
import { DEFAULT_PLANS, DEFAULT_TOOLS } from './constants';

export const INITIAL_PLANS: Plan[] = DEFAULT_PLANS;
export const INITIAL_TOOLS: Tool[] = DEFAULT_TOOLS;

// In-Memory Global Store Singleton for Node environment
interface GlobalStore {
  users: Map<string, User>;
  plans: Map<string, Plan>;
  tools: Map<string, Tool>;
  logs: AiRequestLog[];
  subscriptions: Map<string, Subscription>;
  initialized: boolean;
}

declare global {
  var __AI_SAAS_STORE__: GlobalStore | undefined;
}

export function getStore(): GlobalStore {
  if (!global.__AI_SAAS_STORE__) {
    global.__AI_SAAS_STORE__ = {
      users: new Map(),
      plans: new Map(),
      tools: new Map(),
      logs: [],
      subscriptions: new Map(),
      initialized: false,
    };
    initStore(global.__AI_SAAS_STORE__);
  }
  return global.__AI_SAAS_STORE__;
}

function initStore(store: GlobalStore) {
  if (store.initialized) return;

  // Initialize plans
  INITIAL_PLANS.forEach((plan) => store.plans.set(plan.id, { ...plan }));

  // Initialize tools
  INITIAL_TOOLS.forEach((tool) => store.tools.set(tool.id, { ...tool }));

  // Initialize seed users with hashed passwords
  const salt = bcrypt.genSaltSync(10);
  const adminHash = bcrypt.hashSync('Admin@123', salt);
  const userHash = bcrypt.hashSync('User@123', salt);

  const seedUsers: User[] = [
    {
      id: 'usr_admin_001',
      name: 'Super Admin',
      email: 'admin@aisaas.com',
      passwordHash: adminHash,
      role: 'admin',
      status: 'active',
      planId: 'enterprise',
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      lastLoginAt: new Date().toISOString(),
      apiKeys: [
        {
          id: 'key_admin_01',
          key: 'sk_live_admin_9f8e7d6c5b4a3f2e1d0c',
          name: 'Production Root Key',
          createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
          lastUsedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          totalCalls: 1420,
          status: 'active',
        },
      ],
    },
    {
      id: 'usr_pro_002',
      name: 'Alex Rivera (Pro)',
      email: 'pro@example.com',
      passwordHash: userHash,
      role: 'user',
      status: 'active',
      planId: 'pro',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
      apiKeys: [
        {
          id: 'key_pro_01',
          key: 'sk_live_pro_7a8b9c0d1e2f3a4b5c6d',
          name: 'My NextJS App Key',
          createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
          lastUsedAt: new Date(Date.now() - 7200000).toISOString(),
          totalCalls: 840,
          status: 'active',
        },
      ],
    },
    {
      id: 'usr_starter_003',
      name: 'Sarah Chen (Starter)',
      email: 'starter@example.com',
      passwordHash: userHash,
      role: 'user',
      status: 'active',
      planId: 'starter',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
      apiKeys: [
        {
          id: 'key_starter_01',
          key: 'sk_live_starter_4f5e6d7c8b9a0f1e2d3c',
          name: 'CLI Script Key',
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          lastUsedAt: new Date(Date.now() - 43200000).toISOString(),
          totalCalls: 154,
          status: 'active',
        },
      ],
    },
    {
      id: 'usr_free_004',
      name: 'Jordan Lee (Free)',
      email: 'free@example.com',
      passwordHash: userHash,
      role: 'user',
      status: 'active',
      planId: 'free',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      lastLoginAt: new Date(Date.now() - 1800000).toISOString(),
      apiKeys: [],
    },
  ];

  seedUsers.forEach((u) => {
    store.users.set(u.id, u);
    // Create subscription record
    store.subscriptions.set(u.id, {
      id: `sub_${u.id}`,
      userId: u.id,
      planId: u.planId,
      status: 'active',
      currentPeriodStart: new Date(Date.now() - 15 * 86400000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 15 * 86400000).toISOString(),
      cancelAtPeriodEnd: false,
      updatedAt: new Date().toISOString(),
    });
  });

  // Seed some realistic historic AI request logs for rich analytics
  const sampleLogs: AiRequestLog[] = [
    {
      id: 'log_seed_01',
      userId: 'usr_pro_002',
      userEmail: 'pro@example.com',
      toolId: 'ai-code-generator',
      toolName: 'AI Code Generator & Refactor',
      prompt: 'Write a rate-limiter middleware for Next.js App Router using Redis sliding window.',
      response: `Here is a production-ready rate-limiting middleware for Next.js App Router using a sliding window algorithm in Upstash/Redis:

\`\`\`typescript
import { NextRequest, NextResponse } from 'next/server';

export async function rateLimitMiddleware(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 60;

  // Track request timestamp in sliding window
  // In production, execute Redis ZADD and ZREMRANGEBYSCORE
  return NextResponse.next();
}
\`\`\``,
      model: 'GPT-4 Turbo',
      tokensUsed: { promptTokens: 38, completionTokens: 145, totalTokens: 183 },
      latencyMs: 820,
      date: new Date(Date.now() - 3600000 * 2).toISOString(),
      isFavorite: true,
      source: 'web',
    },
    {
      id: 'log_seed_02',
      userId: 'usr_pro_002',
      userEmail: 'pro@example.com',
      toolId: 'ai-image-prompt',
      toolName: 'AI Image Prompt Generator',
      prompt: 'Isometric 3D render of a cozy modern developer workspace with glowing neon flora.',
      response: `**Midjourney / DALL-E 3 Prompt**:
An isometric 3D render of a high-tech developer sanctuary, minimalist Scandinavian oak standing desk with a matte 34" ultrawide curved monitor displaying clean code syntax, soft ambient indigo and emerald backlight, terrarium filled with bio-luminescent moss and micro-ferns, subtle volumetric morning fog, Ray-traced global illumination, Octane Render, 8k resolution, stylized architectural visualization --ar 16:9 --v 6.0`,
      model: 'GPT-4o',
      tokensUsed: { promptTokens: 25, completionTokens: 110, totalTokens: 135 },
      latencyMs: 640,
      date: new Date(Date.now() - 3600000 * 5).toISOString(),
      isFavorite: true,
      source: 'web',
    },
    {
      id: 'log_seed_03',
      userId: 'usr_starter_003',
      userEmail: 'starter@example.com',
      toolId: 'ai-email-writer',
      toolName: 'AI Email & Copy Writer',
      prompt: 'Draft a polite follow up email after a SaaS product demo.',
      response: `Subject: Quick follow-up regarding our SaaS platform demo

Hi [Client Name],

Thank you for taking the time to explore our platform yesterday! It was great learning more about [Company Name]'s current workflow goals.

As discussed, here is a quick recap of how we help teams like yours:
- **Instant AI Tools**: Automate routine code generation, text synthesis, and copywriting.
- **Enterprise Controls**: Role-based access and secure API key management.

Would Thursday at 2:00 PM EST work for a brief 10-minute touchpoint to review the custom pricing proposal?

Best regards,
Sarah Chen`,
      model: 'GPT-4 Turbo',
      tokensUsed: { promptTokens: 32, completionTokens: 160, totalTokens: 192 },
      latencyMs: 710,
      date: new Date(Date.now() - 3600000 * 8).toISOString(),
      isFavorite: false,
      source: 'web',
    },
    {
      id: 'log_seed_04',
      userId: 'usr_free_004',
      userEmail: 'free@example.com',
      toolId: 'ai-chat',
      toolName: 'AI Chat Assistant',
      prompt: 'What are the main benefits of using TypeScript with Next.js?',
      response: `Using TypeScript with Next.js offers several major advantages:
1. **Compile-Time Safety**: Catches property typos, invalid route params, and payload mismatches before runtime.
2. **First-Class Next.js Support**: Next.js automatically creates and configures \`tsconfig.json\` and supplies end-to-end typed route parameters.
3. **Enhanced Developer Velocity**: Autocomplete, self-documenting prop interfaces, and seamless refactoring tools.`,
      model: 'GPT-3.5 Turbo',
      tokensUsed: { promptTokens: 22, completionTokens: 98, totalTokens: 120 },
      latencyMs: 480,
      date: new Date(Date.now() - 3600000 * 12).toISOString(),
      isFavorite: false,
      source: 'web',
    },
  ];

  store.logs.push(...sampleLogs);
  store.initialized = true;
}
