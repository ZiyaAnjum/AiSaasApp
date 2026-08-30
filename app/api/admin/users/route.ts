import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';
import { PlanTier, UserRole, UserStatus } from '@/lib/types';

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

    const { User: UserModel, PromptHistory: PromptHistoryModel } = await getDb();
    const search = req.nextUrl.searchParams.get('search')?.toLowerCase().trim();
    const planFilter = req.nextUrl.searchParams.get('plan');
    const statusFilter = req.nextUrl.searchParams.get('status');

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const query: any = {};
    if (planFilter && planFilter !== 'all') {
      query.planId = planFilter;
    }
    if (statusFilter && statusFilter !== 'all') {
      query.status = statusFilter;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await UserModel.find(query).sort({ createdAt: -1 }).lean();

    const usersWithStats = await Promise.all(
      users.map(async (u: any) => {
        const totalRequests = await PromptHistoryModel.countDocuments({ userId: u.id });
        const todayRequests = await PromptHistoryModel.countDocuments({
          userId: u.id,
          date: { $gte: startOfToday },
        });

        const tokenAggregation = await PromptHistoryModel.aggregate([
          { $match: { userId: u.id } },
          { $group: { _id: null, totalTokens: { $sum: '$tokensUsed.totalTokens' } } },
        ]);

        const totalTokens = tokenAggregation[0]?.totalTokens || 0;

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          planId: u.planId,
          createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
          lastLoginAt: u.lastLoginAt instanceof Date ? u.lastLoginAt.toISOString() : u.lastLoginAt,
          apiKeysCount: u.apiKeys?.length || 0,
          stats: {
            totalRequests,
            todayRequests,
            totalTokens,
          },
        };
      })
    );

    return NextResponse.json({ users: usersWithStats, total: usersWithStats.length });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required' }, { status: 403 });
    }

    const { User: UserModel, Plan: PlanModel, Subscription: SubscriptionModel } = await getDb();
    const { userId, status, planId, role } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await UserModel.findOne({ id: userId });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from locking out own account
    if (user.id === admin.id && status === 'blocked') {
      return NextResponse.json({ error: 'You cannot block your own admin account' }, { status: 400 });
    }

    if (status && (status === 'active' || status === 'blocked')) {
      user.status = status as UserStatus;
    }

    if (role && (role === 'user' || role === 'admin')) {
      user.role = role as UserRole;
    }

    if (planId) {
      const planExists = await PlanModel.findOne({ id: planId as PlanTier });
      if (planExists) {
        user.planId = planId as PlanTier;
        await SubscriptionModel.updateOne(
          { userId: user.id },
          { $set: { planId: planId as PlanTier, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: `User ${user.email} updated successfully`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        planId: user.planId,
      },
    });
  } catch (error) {
    console.error('Admin users PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
