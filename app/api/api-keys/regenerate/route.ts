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

    const { keyId } = await req.json();
    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    const apiKey = user.apiKeys?.find((k: any) => k.id === keyId);
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not found' }, { status: 404 });
    }

    const oldKey = apiKey.key;
    apiKey.key = generateSecureKeyString(user.planId);
    apiKey.createdAt = new Date();
    await user.save();

    await ApiKeyModel.updateOne(
      { id: keyId },
      { $set: { key: apiKey.key, createdAt: apiKey.createdAt } }
    );

    return NextResponse.json({
      success: true,
      message: 'API Key regenerated. The previous key has been invalidated immediately.',
      oldKeyMasked: `${oldKey.slice(0, 12)}...${oldKey.slice(-4)}`,
      newKey: {
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
        createdAt: apiKey.createdAt instanceof Date ? apiKey.createdAt.toISOString() : apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt instanceof Date ? apiKey.lastUsedAt.toISOString() : apiKey.lastUsedAt,
        totalCalls: apiKey.totalCalls || 0,
        status: apiKey.status,
      },
    });
  } catch (error) {
    console.error('API key regenerate error:', error);
    return NextResponse.json({ error: 'Failed to regenerate API key' }, { status: 500 });
  }
}
