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

    const { Tool: ToolModel } = await getDb();
    const tools = await ToolModel.find().lean();
    return NextResponse.json({ tools });
  } catch (error) {
    console.error('Admin tools GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required' }, { status: 403 });
    }

    const { Tool: ToolModel } = await getDb();
    const body = await req.json();
    const { name, description, category, minPlan, systemPrompt, iconName, inputPlaceholder, samplePrompts, availableModels } = body;

    if (!name || !description || !systemPrompt) {
      return NextResponse.json({ error: 'Name, description, and system prompt are required' }, { status: 400 });
    }

    const toolId = `tool_${Date.now()}_${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const newTool = await ToolModel.create({
      id: toolId,
      name: name.trim(),
      description: description.trim(),
      category: category || 'productivity',
      minPlan: minPlan || 'free',
      systemPrompt: systemPrompt.trim(),
      iconName: iconName || 'Wrench',
      inputPlaceholder: inputPlaceholder || 'Enter your prompt here...',
      samplePrompts: Array.isArray(samplePrompts) ? samplePrompts : ['How does this tool work?'],
      enabled: true,
      availableModels: Array.isArray(availableModels) && availableModels.length > 0 ? availableModels : ['GPT-4 Turbo', 'Gemini 3.7 Flash'],
    });

    return NextResponse.json({
      success: true,
      message: `Tool "${newTool.name}" created successfully`,
      tool: newTool,
    });
  } catch (error) {
    console.error('Admin tools POST error:', error);
    return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required' }, { status: 403 });
    }

    const { Tool: ToolModel } = await getDb();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Tool ID is required' }, { status: 400 });
    }

    const existing = await ToolModel.findOne({ id });
    if (!existing) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    Object.assign(existing, updates);
    existing.id = id; // immutable
    await existing.save();

    return NextResponse.json({
      success: true,
      message: `Tool "${existing.name}" updated successfully`,
      tool: existing,
    });
  } catch (error) {
    console.error('Admin tools PUT error:', error);
    return NextResponse.json({ error: 'Failed to update tool' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required' }, { status: 403 });
    }

    const { Tool: ToolModel } = await getDb();
    const id = req.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing tool ID' }, { status: 400 });
    }

    const tool = await ToolModel.findOneAndDelete({ id });
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Tool "${tool.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Admin tools DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete tool' }, { status: 500 });
  }
}
