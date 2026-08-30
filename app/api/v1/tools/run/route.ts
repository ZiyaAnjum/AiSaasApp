import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isPlanSufficient } from '@/lib/auth';
import { generateAiResponse } from '@/lib/ai-engine';

export async function POST(req: NextRequest) {
  try {
    const { User: UserModel, Plan: PlanModel, Tool: ToolModel, PromptHistory: PromptHistoryModel } = await getDb();

    let apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');
    if (!apiKey && authHeader?.startsWith('Bearer sk_')) {
      apiKey = authHeader.substring(7).trim();
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Unauthorized: Missing API Key' }, { status: 401 });
    }

    const authenticatedUser = await UserModel.findOne({
      'apiKeys.key': apiKey,
      'apiKeys.status': 'active',
    });

    if (!authenticatedUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or revoked API Key' }, { status: 401 });
    }

    if (authenticatedUser.status === 'blocked') {
      return NextResponse.json({ error: 'Forbidden: Account is blocked' }, { status: 403 });
    }

    const matchingKey = authenticatedUser.apiKeys.find((k: any) => k.key === apiKey && k.status === 'active');
    if (matchingKey) {
      matchingKey.totalCalls = (matchingKey.totalCalls || 0) + 1;
      matchingKey.lastUsedAt = new Date();
      await authenticatedUser.save();
    }

    const { toolId, input, model, temperature } = await req.json();

    if (!toolId || !input) {
      return NextResponse.json({ error: 'Both "toolId" and "input" are required' }, { status: 400 });
    }

    const tool = await ToolModel.findOne({ id: toolId });
    if (!tool || !tool.enabled) {
      return NextResponse.json({ error: `Tool "${toolId}" not found or disabled` }, { status: 404 });
    }

    // Access control: plan tier vs tool minPlan
    if (!isPlanSufficient(authenticatedUser.planId, tool.minPlan)) {
      return NextResponse.json(
        {
          error: `Tool "${tool.name}" requires ${tool.minPlan.toUpperCase()} plan. Your API Key is on ${authenticatedUser.planId.toUpperCase()} tier.`,
        },
        { status: 403 }
      );
    }

    const userPlan = await PlanModel.findOne({ id: authenticatedUser.planId });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayUsageCount = await PromptHistoryModel.countDocuments({
      userId: authenticatedUser.id,
      date: { $gte: startOfToday },
    });

    if (userPlan && userPlan.dailyRequestLimit !== -1 && todayUsageCount >= userPlan.dailyRequestLimit) {
      return NextResponse.json({ error: 'Daily request quota exceeded' }, { status: 429 });
    }

    const result = await generateAiResponse(
      tool.id,
      input.trim(),
      model || (tool.availableModels && tool.availableModels[0]) || 'Gemini 3.7 Flash',
      tool.systemPrompt,
      typeof temperature === 'number' ? temperature : 0.7
    );

    const logId = `api_tool_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await PromptHistoryModel.create({
      id: logId,
      userId: authenticatedUser.id,
      userEmail: authenticatedUser.email,
      toolId: tool.id,
      toolName: tool.name,
      prompt: input.trim(),
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
      success: true,
      executionId: logId,
      tool: {
        id: tool.id,
        name: tool.name,
        category: tool.category,
      },
      output: result.text,
      model: result.modelUsed,
      tokens: result.tokens,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    console.error('v1 tools run API error:', error);
    return NextResponse.json({ error: 'Internal API error' }, { status: 500 });
  }
}
