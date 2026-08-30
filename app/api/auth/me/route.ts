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

    const { User: UserModel, Plan: PlanModel, Subscription: SubscriptionModel, PromptHistory: PromptHistoryModel } = await getDb();
    const userDoc = await UserModel.findOne({ id: payload.id });

    if (!userDoc) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userDoc.status === 'blocked') {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
    }

    const planDoc = await PlanModel.findOne({ id: userDoc.planId });
    const subscriptionDoc = await SubscriptionModel.findOne({ userId: userDoc.id });

    // Calculate today's usage from MongoDB
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayCount = await PromptHistoryModel.countDocuments({
      userId: userDoc.id,
      date: { $gte: startOfToday },
    });

    const dailyLimit = planDoc?.dailyRequestLimit ?? 20;
    const dailyRemaining = dailyLimit === -1 ? 999999 : Math.max(0, dailyLimit - todayCount);

    return NextResponse.json({
      user: {
        id: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        role: userDoc.role,
        status: userDoc.status,
        planId: userDoc.planId,
        createdAt: userDoc.createdAt.toISOString(),
        lastLoginAt: userDoc.lastLoginAt?.toISOString(),
        apiKeysCount: userDoc.apiKeys?.length || 0,
      },
      plan: planDoc,
      subscription: subscriptionDoc,
      usage: {
        dailyUsed: todayCount,
        dailyLimit,
        dailyRemaining,
      },
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ error: 'Failed to fetch user session' }, { status: 500 });
  }
}
