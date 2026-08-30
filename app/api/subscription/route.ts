import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';
import { PlanTier } from '@/lib/types';

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

    const { User: UserModel, Plan: PlanModel, Subscription: SubscriptionModel } = await getDb();
    const user = await UserModel.findOne({ id: payload.id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let sub = await SubscriptionModel.findOne({ userId: user.id });
    if (!sub) {
      sub = await SubscriptionModel.create({
        id: `sub_${user.id}`,
        userId: user.id,
        planId: user.planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      });
    }

    const plan = await PlanModel.findOne({ id: user.planId });

    return NextResponse.json({
      subscription: sub,
      plan,
    });
  } catch (error) {
    console.error('Subscription GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve subscription' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { User: UserModel, Plan: PlanModel, Subscription: SubscriptionModel } = await getDb();
    const user = await UserModel.findOne({ id: payload.id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { planId, cancelAtPeriodEnd } = await req.json();

    if (cancelAtPeriodEnd !== undefined) {
      const sub = await SubscriptionModel.findOne({ userId: user.id });
      if (sub) {
        sub.cancelAtPeriodEnd = cancelAtPeriodEnd;
        sub.updatedAt = new Date();
        await sub.save();
      }
      return NextResponse.json({
        success: true,
        message: cancelAtPeriodEnd
          ? 'Auto-renewal has been cancelled. Plan remains active until period end.'
          : 'Auto-renewal reactivated.',
        subscription: sub,
      });
    }

    if (!planId) {
      return NextResponse.json({ error: 'Field "planId" is required' }, { status: 400 });
    }

    const targetPlan = await PlanModel.findOne({ id: planId as PlanTier });
    if (!targetPlan) {
      return NextResponse.json({ error: `Invalid plan tier "${planId}"` }, { status: 400 });
    }

    const previousPlanId = user.planId;
    user.planId = planId as PlanTier;
    await user.save();

    let sub = await SubscriptionModel.findOne({ userId: user.id });
    if (sub) {
      sub.planId = planId as PlanTier;
      sub.status = 'active';
      sub.currentPeriodStart = new Date();
      sub.currentPeriodEnd = new Date(Date.now() + 30 * 86400000);
      sub.cancelAtPeriodEnd = false;
      sub.updatedAt = new Date();
      await sub.save();
    } else {
      sub = await SubscriptionModel.create({
        id: `sub_${user.id}`,
        userId: user.id,
        planId: planId as PlanTier,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to the ${targetPlan.name} plan!`,
      plan: targetPlan,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        planId: user.planId,
        role: user.role,
      },
      previousPlanId,
      subscription: sub,
    });
  } catch (error) {
    console.error('Subscription POST error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
