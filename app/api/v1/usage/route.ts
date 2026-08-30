import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { User: UserModel, Plan: PlanModel, PromptHistory: PromptHistoryModel } = await getDb();

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
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
    }

    const plan = await PlanModel.findOne({ id: authenticatedUser.planId });
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dailyUsed = await PromptHistoryModel.countDocuments({
      userId: authenticatedUser.id,
      date: { $gte: startOfToday },
    });

    const apiLogs = await PromptHistoryModel.find({
      userId: authenticatedUser.id,
      source: 'api',
    }).lean();

    const dailyLimit = plan?.dailyRequestLimit ?? 20;

    return NextResponse.json({
      plan: authenticatedUser.planId,
      dailyQuota: {
        limit: dailyLimit,
        used: dailyUsed,
        remaining: dailyLimit === -1 ? 999999 : Math.max(0, dailyLimit - dailyUsed),
      },
      apiMetrics: {
        totalApiCalls: apiLogs.length,
        totalTokensConsumed: apiLogs.reduce((acc: number, curr: any) => acc + (curr.tokensUsed?.totalTokens || 0), 0),
      },
    });
  } catch (error) {
    console.error('v1 usage API error:', error);
    return NextResponse.json({ error: 'Internal API error' }, { status: 500 });
  }
}
