import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createToken } from '@/lib/auth';
import { DEFAULT_PLANS } from '@/lib/constants';
import { User, PlanTier } from '@/lib/types';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { role } = await req.json();

    const roleMap: Record<string, { id: string; name: string; email: string; planId: PlanTier; role: 'admin' | 'user' }> = {
      admin: {
        id: 'usr_admin',
        name: 'Alex Rivera (Admin)',
        email: 'admin@aisaas.com',
        planId: 'enterprise',
        role: 'admin',
      },
      pro: {
        id: 'usr_pro',
        name: 'Sarah Chen (Pro User)',
        email: 'pro@example.com',
        planId: 'pro',
        role: 'user',
      },
      starter: {
        id: 'usr_starter',
        name: 'David Miller (Starter)',
        email: 'starter@example.com',
        planId: 'starter',
        role: 'user',
      },
      free: {
        id: 'usr_free',
        name: 'Emma Watson (Free)',
        email: 'free@example.com',
        planId: 'free',
        role: 'user',
      },
    };

    const target = roleMap[role] || roleMap.pro;
    const plan = DEFAULT_PLANS.find((p) => p.id === target.planId) || DEFAULT_PLANS[0];

    try {
      const { User: UserModel, Plan: PlanModel, Subscription: SubscriptionModel, ApiKey: ApiKeyModel } = await getDb();

      // Ensure plan exists in DB
      await PlanModel.updateOne({ id: plan.id }, { $set: plan }, { upsert: true });

      // Check or upsert User
      let userDoc = await UserModel.findOne({ email: target.email });
      if (!userDoc) {
        const passwordHash = bcrypt.hashSync(target.role === 'admin' ? 'Admin@123' : 'User@123', 10);
        userDoc = await UserModel.create({
          id: target.id,
          name: target.name,
          email: target.email,
          passwordHash,
          role: target.role,
          status: 'active',
          planId: target.planId,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          apiKeys: [
            {
              id: `key_${target.planId}_primary`,
              key: `sk_live_${target.planId}_${Math.random().toString(36).substring(2, 15)}`,
              name: 'Default Live Key',
              createdAt: new Date(),
              lastUsedAt: new Date(),
              totalCalls: 10,
              status: 'active',
            },
          ],
        });

        await ApiKeyModel.create({
          id: `key_${target.planId}_primary`,
          key: `sk_live_${target.planId}_${Math.random().toString(36).substring(2, 15)}`,
          userId: target.id,
          userEmail: target.email,
          name: 'Default Live Key',
          createdAt: new Date(),
          lastUsedAt: new Date(),
          totalCalls: 10,
          status: 'active',
        });
      } else {
        userDoc.planId = target.planId;
        userDoc.role = target.role;
        userDoc.lastLoginAt = new Date();
        await userDoc.save();
      }

      // Upsert Subscription
      const subDoc = await SubscriptionModel.findOneAndUpdate(
        { userId: userDoc.id },
        {
          id: `sub_${userDoc.id}`,
          userId: userDoc.id,
          planId: target.planId,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
          cancelAtPeriodEnd: false,
        },
        { upsert: true, new: true }
      );

      const userForToken: User = {
        id: userDoc.id,
        name: userDoc.name,
        email: userDoc.email,
        passwordHash: userDoc.passwordHash,
        role: userDoc.role,
        status: userDoc.status,
        planId: target.planId,
        createdAt: userDoc.createdAt.toISOString(),
        lastLoginAt: userDoc.lastLoginAt?.toISOString(),
        apiKeys: (userDoc.apiKeys || []).map((k: { id: string; key: string; name: string; createdAt: Date; lastUsedAt?: Date; totalCalls: number; status: 'active' | 'revoked' }) => ({
          id: k.id,
          key: k.key,
          name: k.name,
          createdAt: k.createdAt.toISOString(),
          lastUsedAt: k.lastUsedAt?.toISOString(),
          totalCalls: k.totalCalls,
          status: k.status,
        })),
      };

      const token = await createToken(userForToken);

      const response = NextResponse.json({
        success: true,
        token,
        user: {
          id: userDoc.id,
          name: userDoc.name,
          email: userDoc.email,
          role: userDoc.role,
          status: userDoc.status,
          planId: target.planId,
          createdAt: userDoc.createdAt.toISOString(),
          lastLoginAt: userDoc.lastLoginAt?.toISOString(),
        },
        plan,
        subscription: subDoc,
      });

      response.cookies.set('token', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    } catch (dbErr) {
      console.warn('Database error in demo-switch, generating standalone fallback session:', dbErr);
      // Standalone memory token if DB is disconnected
      const fallbackUser: User = {
        id: target.id,
        name: target.name,
        email: target.email,
        passwordHash: '',
        role: target.role,
        status: 'active',
        planId: target.planId,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        apiKeys: [],
      };

      const token = await createToken(fallbackUser);

      return NextResponse.json({
        success: true,
        token,
        user: fallbackUser,
        plan,
        subscription: {
          id: `sub_${target.id}`,
          userId: target.id,
          planId: target.planId,
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
          cancelAtPeriodEnd: false,
        },
      });
    }
  } catch (error) {
    console.error('Demo switch error:', error);
    return NextResponse.json({ error: 'Failed to switch demo account' }, { status: 500 });
  }
}
