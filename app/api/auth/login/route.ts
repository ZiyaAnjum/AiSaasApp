import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { comparePassword, createToken } from '@/lib/auth';
import { User } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { User: UserModel } = await getDb();

    const normalizedEmail = email.toLowerCase().trim();
    const userDoc = await UserModel.findOne({ email: normalizedEmail });

    if (!userDoc) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
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
      apiKeys: userDoc.apiKeys.map((k) => ({
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
