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

    const { Subscription: SubscriptionModel, User: UserModel, Plan: PlanModel } = await getDb();

    const subscriptions = await SubscriptionModel.find().lean();
    const users = await UserModel.find().lean();
    const plans = await PlanModel.find().lean();

    const userMap = new Map(users.map((u: any) => [u.id, u]));
    const planMap = new Map(plans.map((p: any) => [p.id, p]));

    const subscriptionsList = subscriptions.map((sub: any) => {
      const user = userMap.get(sub.userId);
      const plan = planMap.get(sub.planId);

      return {
        id: sub.id,
        userId: sub.userId,
        userEmail: user?.email || 'Unknown',
        userName: user?.name || 'Unknown',
        planId: sub.planId,
        planName: plan?.name || sub.planId,
        price: plan?.price || 0,
        status: sub.status,
        currentPeriodStart: sub.currentPeriodStart instanceof Date ? sub.currentPeriodStart.toISOString() : sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd instanceof Date ? sub.currentPeriodEnd.toISOString() : sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        updatedAt: sub.updatedAt instanceof Date ? sub.updatedAt.toISOString() : sub.updatedAt,
      };
    });

    return NextResponse.json({ subscriptions: subscriptionsList, total: subscriptionsList.length });
  } catch (error) {
    console.error('Admin subscriptions GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}
