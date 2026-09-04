import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { comparePassword, createToken } from '@/lib/auth';
import { DEFAULT_PLANS } from '@/lib/constants';
import { User } from '@/lib/types';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { User: UserModel, Plan: PlanModel, Subscription: SubscriptionModel } = await getDb();

    const normalizedEmail = email.toLowerCase().trim();
    let userDoc = await UserModel.findOne({ email: normalizedEmail });

    // If demo account not yet in DB, provision automatically
    if (!userDoc) {
      const demoAccounts: Record<string, { name: string; planId: 'enterprise' | 'pro' | 'starter' | 'free'; role: 'admin' | 'user'; pass: string }> = {
        'admin@aisaas.com': { name: 'Alex Rivera (Admin)', planId: 'enterprise', role: 'admin', pass: 'Admin@123' },
        'pro@example.com': { name: 'Sarah Chen (Pro User)', planId: 'pro', role: 'user', pass: 'User@123' },
        'starter@example.com': { name: 'David Miller (Starter)', planId: 'starter', role: 'user', pass: 'User@123' },
        'free@example.com': { name: 'Emma Watson (Free)', planId: 'free', role: 'user', pass: 'User@123' },
      };

      const demo = demoAccounts[normalizedEmail];
      if (demo && password === demo.pass) {
        const passwordHash = bcrypt.hashSync(demo.pass, 10);
        userDoc = await UserModel.create({
          id: `usr_${demo.planId}_${Date.now()}`,
          name: demo.name,
          email: normalizedEmail,
          passwordHash,
          role: demo.role,
          status: 'active',
          planId: demo.planId,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          apiKeys: [],
        });
      } else {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
    }

    if (userDoc.status === 'blocked') {
      return NextResponse.json(
        { error: 'Your account has been suspended by an administrator.' },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, userDoc.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    userDoc.lastLoginAt = new Date();
    await userDoc.save();

    const planDoc = await PlanModel.findOne({ id: userDoc.planId }) || DEFAULT_PLANS.find(p => p.id === userDoc.planId) || DEFAULT_PLANS[0];
    const subscriptionDoc = await SubscriptionModel.findOne({ userId: userDoc.id });

    const userForToken: User = {
      id: userDoc.id,
      name: userDoc.name,
      email: userDoc.email,
      passwordHash: userDoc.passwordHash,
      role: userDoc.role,
      status: userDoc.status,
      planId: userDoc.planId,
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
        planId: userDoc.planId,
        createdAt: userDoc.createdAt.toISOString(),
      },
      plan: planDoc,
      subscription: subscriptionDoc,
    });

    response.cookies.set('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Failed to authenticate user' }, { status: 500 });
  }
}
