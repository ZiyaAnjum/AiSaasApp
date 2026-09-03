import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { extractBearerToken, verifyToken, isPlanSufficient } from '@/lib/auth';
import { generateAiResponse } from '@/lib/ai-engine';

export async function POST(req: NextRequest) {
  try {
    const { User: UserModel, Plan: PlanModel, Tool: ToolModel, PromptHistory: PromptHistoryModel } = await getDb();

    // 1. Auth check
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    const user = await UserModel.findOne({ id: payload.id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    if (user.status === 'blocked') {
      return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 });
    }

    // 2. Parse request body
    const {
      toolId,
      prompt,
      modelA = 'Gemini 3.8 Flash',
      modelB = 'GPT-4 Turbo',
      temperatureA = 0.7,
      temperatureB = 0.7,
      systemPrompt,
      tags = ['Arena'],
      workspace = 'Default',
    } = await req.json();

    if (!toolId || !prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'toolId and prompt are required' }, { status: 400 });
    }

    const tool = await ToolModel.findOne({ id: toolId });
    if (!tool || !tool.enabled) {
      return NextResponse.json({ error: `Tool "${toolId}" is currently disabled.` }, { status: 404 });
    }

    // 3. Plan verification
    const userPlan = user.planId || 'free';
    if (!isPlanSufficient(userPlan, tool.minPlan)) {
      return NextResponse.json(
        { error: `Tool "${tool.name}" requires ${tool.minPlan.toUpperCase()} plan.` },
        { status: 403 }
      );
    }

    // 4. Check quota (counts as 1 arena request)
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
        { error: `Daily limit reached (${todayUsageCount}/${dailyLimit} requests used today).` },
        { status: 429 }
      );
    }

    const sysPrompt = systemPrompt || tool.systemPrompt;

    // 5. Execute both models concurrently
    const [resultA, resultB] = await Promise.all([
      generateAiResponse(tool.id, prompt.trim(), modelA, sysPrompt, temperatureA),
      generateAiResponse(tool.id, prompt.trim(), modelB, sysPrompt, temperatureB),
    ]);

    // 6. Log Arena Comparison to MongoDB
    const logId = `arena_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await PromptHistoryModel.create({
      id: logId,
      userId: user.id,
      userEmail: user.email,
      toolId: tool.id,
      toolName: `${tool.name} (Arena Battle)`,
      prompt: prompt.trim(),
      response: resultA.text,
      model: `${resultA.modelUsed} vs ${resultB.modelUsed}`,
      tokensUsed: {
        promptTokens: resultA.tokens.promptTokens + resultB.tokens.promptTokens,
        completionTokens: resultA.tokens.completionTokens + resultB.tokens.completionTokens,
        totalTokens: resultA.tokens.totalTokens + resultB.tokens.totalTokens,
      },
      latencyMs: Math.max(resultA.latencyMs, resultB.latencyMs),
      date: new Date(),
      isFavorite: false,
      source: 'web',
      tags: [...tags, 'Arena'],
      workspace,
      isArena: true,
      arenaModelB: resultB.modelUsed,
      arenaResponseB: resultB.text,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: logId,
        prompt: prompt.trim(),
        modelA: {
          name: resultA.modelUsed,
          response: resultA.text,
          latencyMs: resultA.latencyMs,
          tokens: resultA.tokens,
        },
        modelB: {
          name: resultB.modelUsed,
          response: resultB.text,
          latencyMs: resultB.latencyMs,
          tokens: resultB.tokens,
        },
        date: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Arena API error:', error);
    return NextResponse.json({ error: 'Failed to execute arena battle' }, { status: 500 });
  }
}
