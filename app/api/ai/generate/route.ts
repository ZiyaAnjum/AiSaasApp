import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken, isPlanSufficient, extractBearerToken } from '@/lib/auth';
import { generateAiResponse } from '@/lib/ai-engine';

export async function POST(req: NextRequest) {
  try {
    const { User: UserModel, Plan: PlanModel, Tool: ToolModel, PromptHistory: PromptHistoryModel } = await getDb();

    // 1. Authentication Check (Bearer token or x-api-key)
    const token = extractBearerToken(req);
    const apiKeyHeader = req.headers.get('x-api-key');

    let user: any = null;
    let authSource: 'web' | 'api' = 'web';
    let apiKeyId: string | undefined;

    if (token) {
      const payload = await verifyToken(token);
      if (!payload || !payload.id) {
        return NextResponse.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
      }
      user = await UserModel.findOne({ id: payload.id });
    } else if (apiKeyHeader) {
      authSource = 'api';
      user = await UserModel.findOne({
        'apiKeys.key': apiKeyHeader,
        'apiKeys.status': 'active',
      });
      if (user) {
        const matchingKey = user.apiKeys.find(
          (k: any) => k.key === apiKeyHeader && k.status === 'active'
        );
        if (matchingKey) {
          apiKeyId = matchingKey.id;
          matchingKey.totalCalls = (matchingKey.totalCalls || 0) + 1;
          matchingKey.lastUsedAt = new Date();
          await user.save();
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required. Please sign in or provide an active API key.' },
        { status: 401 }
      );
    }

    if (user.status === 'blocked') {
      return NextResponse.json(
        { error: 'Your account has been suspended by an administrator.' },
        { status: 403 }
      );
    }

    // 2. Parse Request Body
    const body = await req.json();
    const { toolId, prompt, model, temperature, systemPrompt } = body;

    if (!toolId || !prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: "toolId" and "prompt" are required' },
        { status: 400 }
      );
    }

    // 3. Find Tool and Validate Enabled
    const tool = await ToolModel.findOne({ id: toolId });
    if (!tool || !tool.enabled) {
      return NextResponse.json(
        { error: `Tool "${toolId}" is currently unavailable or disabled.` },
        { status: 404 }
      );
    }

    // 4. Role / Plan Tier Access Control
    const userPlan = user.planId || 'free';
    const isAllowed = isPlanSufficient(userPlan, tool.minPlan);
    if (!isAllowed) {
      return NextResponse.json(
        {
          error: `Tool "${tool.name}" requires ${tool.minPlan.toUpperCase()} plan. Your current plan is ${userPlan.toUpperCase()}. Please upgrade to use this tool.`,
          requiredPlan: tool.minPlan,
          userPlan: userPlan,
        },
        { status: 403 }
      );
    }

    // 5. Rate Limiting & Quota Check
    const plan = await PlanModel.findOne({ id: userPlan });
    const dailyLimit = plan?.dailyRequestLimit ?? 20;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayUsageCount = await PromptHistoryModel.countDocuments({
      userId: user.id,
      date: { $gte: startOfToday },
    });

    if (dailyLimit !== -1 && todayUsageCount >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Daily limit reached (${todayUsageCount}/${dailyLimit} requests used today). Please upgrade your plan for higher or unlimited limits.`,
          dailyLimit,
          dailyUsed: todayUsageCount,
          plan: userPlan,
        },
        { status: 429 }
      );
    }

    // 6. Execute AI Generation
    const sysPrompt = systemPrompt || tool.systemPrompt;
    const modelToUse = model || (tool.availableModels && tool.availableModels[0]) || 'Gemini 3.7 Flash';
    const temp = typeof temperature === 'number' ? Math.max(0, Math.min(1.5, temperature)) : 0.7;

    const aiResult = await generateAiResponse(tool.id, prompt.trim(), modelToUse, sysPrompt, temp);

    // 7. Store Log in MongoDB
    const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const logDoc = await PromptHistoryModel.create({
      id: logId,
      userId: user.id,
      userEmail: user.email,
      toolId: tool.id,
      toolName: tool.name,
      prompt: prompt.trim(),
      response: aiResult.text,
      model: aiResult.modelUsed,
      tokensUsed: aiResult.tokens,
      latencyMs: aiResult.latencyMs,
      date: new Date(),
      isFavorite: false,
      source: authSource,
      apiKeyId,
    });

    const newDailyUsed = todayUsageCount + 1;
    const remaining = dailyLimit === -1 ? 999999 : Math.max(0, dailyLimit - newDailyUsed);

    return NextResponse.json({
      success: true,
      data: {
        id: logDoc.id,
        text: aiResult.text,
        modelUsed: aiResult.modelUsed,
        tokens: aiResult.tokens,
        latencyMs: aiResult.latencyMs,
        toolName: tool.name,
        date: logDoc.date.toISOString(),
      },
      quota: {
        dailyUsed: newDailyUsed,
        dailyLimit,
        remaining,
      },
    });
  } catch (error) {
    console.error('AI Generation API error:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating AI response. Please try again.' },
      { status: 500 }
    );
  }
}
