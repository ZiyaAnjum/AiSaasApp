import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword, createToken } from '@/lib/auth';
import { User } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const { User: UserModel, Subscription: SubscriptionModel } = await getDb();

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUserDoc = await UserModel.create({
      id: userId,
      name: name?.trim() || email.split('@')[0],
      email: normalizedEmail,
      passwordHash,
      role: 'user',
      status: 'active',
      planId: 'free',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      apiKeys: [],
    });

    // Default Free subscription
    await SubscriptionModel.create({
      id: `sub_${userId}`,
      userId: userId,
      planId: 'free',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    });

    const userForToken: User = {
      id: newUserDoc.id,
      name: newUserDoc.name,
      email: newUserDoc.email,
      passwordHash: newUserDoc.passwordHash,
      role: newUserDoc.role,
      status: newUserDoc.status,
      planId: newUserDoc.planId,
      createdAt: newUserDoc.createdAt.toISOString(),
      lastLoginAt: newUserDoc.lastLoginAt?.toISOString(),
      apiKeys: [],
    };

    const token = await createToken(userForToken);

    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: newUserDoc.id,
        name: newUserDoc.name,
        email: newUserDoc.email,
        role: newUserDoc.role,
        status: newUserDoc.status,
        planId: newUserDoc.planId,
        createdAt: newUserDoc.createdAt.toISOString(),
      },
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
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to create account in database' }, { status: 500 });
  }
}
