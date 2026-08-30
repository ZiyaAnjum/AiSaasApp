import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

async function checkAdmin(req: NextRequest) {
  const token = extractBearerToken(req);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required' }, { status: 403 });
    }

    const { User: UserModel, Plan: PlanModel, PromptHistory: PromptHistoryModel } = await getDb();

    const users = await UserModel.find().lean();
    const plans = await PlanModel.find().lean();
    const totalUsers = users.length;
    const activeUsers = users.filter((u: any) => u.status === 'active').length;
    const blockedUsers = users.filter((u: any) => u.status === 'blocked').length;

    const totalRequests = await PromptHistoryModel.countDocuments();

    const tokenAgg = await PromptHistoryModel.aggregate([
      { $group: { _id: null, totalTokens: { $sum: '$tokensUsed.totalTokens' } } },
    ]);
    const totalTokens = tokenAgg[0]?.totalTokens || 0;

    const planPriceMap = new Map(plans.map((p: any) => [p.id, p.price || 0]));
    let estimatedMonthlyRevenue = 0;
    users.forEach((u: any) => {
      estimatedMonthlyRevenue += planPriceMap.get(u.planId) || 0;
    });

    let totalApiKeys = 0;
    users.forEach((u: any) => {
      totalApiKeys += u.apiKeys?.length || 0;
    });

    // Plan distribution
    const planDistribution: { [plan: string]: number } = {
      free: 0,
      starter: 0,
      pro: 0,
      enterprise: 0,
    };
    users.forEach((u: any) => {
      planDistribution[u.planId] = (planDistribution[u.planId] || 0) + 1;
    });

    // Tool usage distribution via aggregation
    const toolAgg = await PromptHistoryModel.aggregate([
      {
        $group: {
          _id: '$toolName',
          count: { $sum: 1 },
          tokens: { $sum: '$tokensUsed.totalTokens' },
        },
      },
    ]);

    const toolStats: { [toolName: string]: { count: number; tokens: number } } = {};
    toolAgg.forEach((item: any) => {
      if (item._id) {
        toolStats[item._id] = { count: item.count, tokens: item.tokens };
      }
    });

    // 14-day requests timeline
    const allRecentLogs = await PromptHistoryModel.find({
      date: { $gte: new Date(Date.now() - 14 * 86400000) },
    }).lean();

    const timeline: { date: string; requests: number; tokens: number; webRequests: number; apiRequests: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateKey = d.toISOString().split('T')[0];
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayLogs = allRecentLogs.filter((l: any) => {
        const ld = new Date(l.date);
        return ld >= dayStart && ld <= dayEnd;
      });

      const dayTokens = dayLogs.reduce((acc: number, curr: any) => acc + (curr.tokensUsed?.totalTokens || 0), 0);
      const webLogs = dayLogs.filter((l: any) => l.source === 'web').length;
      const apiLogs = dayLogs.filter((l: any) => l.source === 'api').length;

      timeline.push({
        date: dateKey.substring(5),
        requests: dayLogs.length,
        tokens: dayTokens,
        webRequests: webLogs,
        apiRequests: apiLogs,
      });
    }

    // Recent 50 audit logs
    const recentLogsDocs = await PromptHistoryModel.find()
      .sort({ date: -1 })
      .limit(50)
      .lean();

    const recentLogs = recentLogsDocs.map((l: any) => ({
      id: l.id,
      userEmail: l.userEmail,
      toolName: l.toolName,
      promptPreview: l.prompt.slice(0, 80),
      model: l.model,
      tokens: l.tokensUsed?.totalTokens || 0,
      latencyMs: l.latencyMs,
      source: l.source,
      date: l.date instanceof Date ? l.date.toISOString() : l.date,
    }));

    return NextResponse.json({
      metrics: {
        totalUsers,
        activeUsers,
        blockedUsers,
        totalRequests,
        totalTokens,
        estimatedMonthlyRevenue,
        totalApiKeys,
      },
      planDistribution,
      toolStats,
      timeline,
      recentLogs,
    });
  } catch (error) {
    console.error('Admin analytics GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin analytics' }, { status: 500 });
  }
}
