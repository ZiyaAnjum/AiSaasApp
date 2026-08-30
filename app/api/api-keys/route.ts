import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';

function generateSecureKeyString(tier: string): string {
  const chars = 'abcdef0123456789';
  let rand = '';
  for (let i = 0; i < 32; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `sk_live_${tier}_${rand}`;
}

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

    const { User: UserModel, PromptHistory: PromptHistoryModel } = await getDb();
    const user = await UserModel.findOne({ id: payload.id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalApiRequests = await PromptHistoryModel.countDocuments({
      userId: user.id,
      source: 'api',
    });

    const formattedKeys = (user.apiKeys || []).map((k: any) => ({
      id: k.id,
      key: k.key,
      name: k.name,
      createdAt: k.createdAt instanceof Date ? k.createdAt.toISOString() : k.createdAt,
      lastUsedAt: k.lastUsedAt instanceof Date ? k.lastUsedAt.toISOString() : k.lastUsedAt,
      totalCalls: k.totalCalls || 0,
      status: k.status,
    }));

    return NextResponse.json({
      keys: formattedKeys,
      stats: {
        totalApiRequests,
        totalKeys: formattedKeys.length,
        activeKeys: formattedKeys.filter((k) => k.status === 'active').length,
      },
    });
  } catch (error) {
    console.error('API keys GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
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

    const { User: UserModel, ApiKey: ApiKeyModel } = await getDb();
    const user = await UserModel.findOne({ id: payload.id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Plan check: Free plan users cannot create API keys (only Starter, Pro, Enterprise)
    if (user.planId === 'free') {
      return NextResponse.json(
        { error: 'API Key access requires a Starter plan or higher. Please upgrade your subscription.' },
        { status: 403 }
      );
    }

    if (!user.apiKeys) {
      user.apiKeys = [];
    }

    const { name } = await req.json();
    const keyName = name?.trim() || `API Key #${user.apiKeys.length + 1}`;

    const newKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      key: generateSecureKeyString(user.planId),
      name: keyName,
      createdAt: new Date(),
      lastUsedAt: undefined,
      totalCalls: 0,
      status: 'active' as const,
    };

    user.apiKeys.push(newKey);
    await user.save();

    await ApiKeyModel.create({
      id: newKey.id,
      key: newKey.key,
      userId: user.id,
      userEmail: user.email,
      name: newKey.name,
      createdAt: newKey.createdAt,
      totalCalls: 0,
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: 'API Key created successfully. Make sure to copy it now.',
      key: {
        ...newKey,
        createdAt: newKey.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('API keys POST error:', error);
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { User: UserModel, ApiKey: ApiKeyModel } = await getDb();
    const user = await UserModel.findOne({ id: payload.id });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json({ error: 'Missing key ID parameter' }, { status: 400 });
    }

    const keyIndex = user.apiKeys.findIndex((k: any) => k.id === keyId);
    if (keyIndex === -1) {
      return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
    }

    user.apiKeys.splice(keyIndex, 1);
    await user.save();

    await ApiKeyModel.deleteOne({ id: keyId });

    return NextResponse.json({
      success: true,
      message: 'API Key revoked and deleted successfully',
    });
  } catch (error) {
    console.error('API keys DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 });
  }
}
