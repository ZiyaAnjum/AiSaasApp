import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateAiResponse } from '@/lib/ai-engine';

export async function POST(req: NextRequest) {
  try {
    const { User: UserModel, Plan: PlanModel, PromptHistory: PromptHistoryModel } = await getDb();

    // Authenticate with x-api-key or Bearer sk_live_
    let apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');
    if (!apiKey && authHeader?.startsWith('Bearer sk_')) {
      apiKey = authHeader.substring(7).trim();
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing API Key. Provide via "x-api-key" header or "Authorization: Bearer <key>"' },
        { status: 401 }
      );
    }

    // Lookup user by active API key in MongoDB
    const authenticatedUser = await UserModel.findOne({
      'apiKeys.key': apiKey,
      'apiKeys.status': 'active',
    });

    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or revoked API Key' }, { status: 401 });
    }

    if (authenticatedUser.status === 'blocked') {
      return NextResponse.json({ error: 'Forbidden: User account is suspended' }, { status: 403 });
    }

    const matchingKey = authenticatedUser.apiKeys.find((k: any) => k.key === apiKey && k.status === 'active');
    if (matchingKey) {
      matchingKey.totalCalls = (matchingKey.totalCalls || 0) + 1;
      matchingKey.lastUsedAt = new Date();
      await authenticatedUser.save();
    }

    const plan = await PlanModel.findOne({ id: authenticatedUser.planId });
    if (!plan) {
      return NextResponse.json({ error: 'Subscription plan not found' }, { status: 400 });
    }

    // Rate limit check
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayUsageCount = await PromptHistoryModel.countDocuments({
      userId: authenticatedUser.id,
      date: { $gte: startOfToday },
    });

    if (plan.dailyRequestLimit !== -1 && todayUsageCount >= plan.dailyRequestLimit) {
      return NextResponse.json(
        {
          error: 'Daily API quota limit exceeded',
          limit: plan.dailyRequestLimit,
          used: todayUsageCount,
          plan: authenticatedUser.planId,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { message, model, temperature, systemPrompt } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Field "message" (string) is required' }, { status: 400 });
    }

    const modelToUse = model || (plan.allowedModels && plan.allowedModels[0]) || 'Gemini 3.7 Flash';
    const sysPrompt = systemPrompt || 'You are an advanced AI SaaS assistant serving developer API requests.';

    const result = await generateAiResponse(
      'ai-chat',
      message.trim(),
      modelToUse,
      sysPrompt,
      typeof temperature === 'number' ? temperature : 0.7
    );

    // Record log in MongoDB
    const logId = `api_log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await PromptHistoryModel.create({
      id: logId,
      userId: authenticatedUser.id,
      userEmail: authenticatedUser.email,
      toolId: 'ai-chat',
      toolName: 'AI Chat Assistant',
      prompt: message.trim(),
      response: result.text,
      model: result.modelUsed,
      tokensUsed: result.tokens,
      latencyMs: result.latencyMs,
      date: new Date(),
      isFavorite: false,
      source: 'api',
      apiKeyId: matchingKey?.id,
    });

    return NextResponse.json({
      id: logId,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: result.modelUsed,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: result.text,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: result.tokens.promptTokens,
        completion_tokens: result.tokens.completionTokens,
        total_tokens: result.tokens.totalTokens,
      },
      latency_ms: result.latencyMs,
    });
  } catch (error) {
    console.error('v1 chat API error:', error);
    return NextResponse.json({ error: 'Internal API Gateway error' }, { status: 500 });
  }
}
