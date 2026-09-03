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

    const { PromptHistory: PromptHistoryModel } = await getDb();
    const searchParams = req.nextUrl.searchParams;
    const toolId = searchParams.get('toolId');
    const search = searchParams.get('search')?.trim();
    const favoritesOnly = searchParams.get('favorites') === 'true';
    const workspace = searchParams.get('workspace');
    const arenaOnly = searchParams.get('arena') === 'true';

    const query: any = { userId: payload.id };

    if (toolId && toolId !== 'all') {
      query.toolId = toolId;
    }

    if (favoritesOnly) {
      query.isFavorite = true;
    }

    if (workspace && workspace !== 'all') {
      query.workspace = workspace;
    }

    if (arenaOnly) {
      query.isArena = true;
    }

    if (search) {
      query.$or = [
        { prompt: { $regex: search, $options: 'i' } },
        { response: { $regex: search, $options: 'i' } },
        { toolName: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const logs = await PromptHistoryModel.find(query).sort({ date: -1 }).limit(100).lean();

    const formattedLogs = logs.map((l: any) => ({
      id: l.id,
      userId: l.userId,
      userEmail: l.userEmail,
      toolId: l.toolId,
      toolName: l.toolName,
      prompt: l.prompt,
      response: l.response,
      model: l.model,
      tokensUsed: l.tokensUsed,
      latencyMs: l.latencyMs,
      date: l.date instanceof Date ? l.date.toISOString() : l.date,
      isFavorite: l.isFavorite,
      source: l.source,
      apiKeyId: l.apiKeyId,
      tags: l.tags || [],
      workspace: l.workspace || 'Default',
      isArena: l.isArena || false,
      arenaModelB: l.arenaModelB,
      arenaResponseB: l.arenaResponseB,
      arenaWinner: l.arenaWinner,
    }));

    return NextResponse.json({
      history: formattedLogs,
      total: formattedLogs.length,
    });
  } catch (error) {
    console.error('History GET error:', error);
    return NextResponse.json({ error: 'Failed to retrieve history' }, { status: 500 });
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

    const { PromptHistory: PromptHistoryModel } = await getDb();
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      await PromptHistoryModel.deleteMany({ userId: payload.id });
      return NextResponse.json({ success: true, message: 'All prompt history cleared' });
    }

    if (id) {
      const result = await PromptHistoryModel.deleteOne({ id, userId: payload.id });
      if (result.deletedCount > 0) {
        return NextResponse.json({ success: true, message: 'History item removed' });
      }
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Missing log ID or clearAll parameter' }, { status: 400 });
  } catch (error) {
    console.error('History DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete history' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { PromptHistory: PromptHistoryModel } = await getDb();
    const { id, isFavorite, arenaWinner, tags, workspace } = await req.json();

    const log = await PromptHistoryModel.findOne({ id, userId: payload.id });
    if (!log) {
      return NextResponse.json({ error: 'History item not found' }, { status: 404 });
    }

    if (typeof isFavorite === 'boolean') {
      log.isFavorite = isFavorite;
    }
    if (arenaWinner) {
      log.arenaWinner = arenaWinner;
    }
    if (Array.isArray(tags)) {
      log.tags = tags;
    }
    if (workspace) {
      log.workspace = workspace;
    }

    await log.save();

    return NextResponse.json({
      success: true,
      message: 'History item updated successfully',
      isFavorite: log.isFavorite,
      arenaWinner: log.arenaWinner,
    });
  } catch (error) {
    console.error('History PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update favorite status' }, { status: 500 });
  }
}
