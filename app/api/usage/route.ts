import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { User: UserModel, Plan: PlanModel, PromptHistory: PromptHistoryModel } = await getDb();
    const user = await UserModel.findOne({ id: payload.id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const plan = await PlanModel.findOne({ id: user.planId });
    const userLogs = await PromptHistoryModel.find({ userId: user.id }).sort({ date: -1 }).lean();

    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayCount = userLogs.filter((l: any) => new Date(l.date) >= startOfToday).length;
    const monthCount = userLogs.filter((l: any) => new Date(l.date) >= startOfMonth).length;

    const dailyLimit = plan?.dailyRequestLimit ?? 20;
    const dailyUsed = todayCount;
    const dailyRemaining = dailyLimit === -1 ? 999999 : Math.max(0, dailyLimit - dailyUsed);
    const monthlyUsed = monthCount;

    let totalTokensUsed = 0;
    const toolBreakdown: { [toolName: string]: number } = {};
    const modelBreakdown: { [model: string]: number } = {};

    userLogs.forEach((log: any) => {
      totalTokensUsed += log.tokensUsed?.totalTokens || 0;
      if (log.toolName) {
        toolBreakdown[log.toolName] = (toolBreakdown[log.toolName] || 0) + 1;
      }
      if (log.model) {
        modelBreakdown[log.model] = (modelBreakdown[log.model] || 0) + 1;
      }
    });

    // 7-day daily trend
    const dailyTrend: { date: string; requests: number; tokens: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateKey = d.toISOString().split('T')[0];
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayLogs = userLogs.filter((l: any) => {
        const logDate = new Date(l.date);
        return logDate >= dayStart && logDate <= dayEnd;
      });

      const dayTokens = dayLogs.reduce((acc: number, curr: any) => acc + (curr.tokensUsed?.totalTokens || 0), 0);

      dailyTrend.push({
        date: dateKey.substring(5), // MM-DD
        requests: dayLogs.length,
        tokens: dayTokens,
      });
    }

    return NextResponse.json({
      summary: {
        dailyUsed,
        dailyLimit,
        dailyRemaining,
        monthlyUsed,
        totalTokensUsed,
        toolBreakdown,
        modelBreakdown,
        dailyTrend,
        planName: plan?.name || 'Free',
        planTier: user.planId,
      },
    });
  } catch (error) {
    console.error('Usage endpoint error:', error);
    return NextResponse.json({ error: 'Failed to retrieve usage stats' }, { status: 500 });
  }
}
