import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken, extractBearerToken, isPlanSufficient } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { User: UserModel, Tool: ToolModel } = await getDb();
    const token = extractBearerToken(req);

    let userPlan = 'free';
    if (token) {
      const payload = await verifyToken(token);
      if (payload?.id) {
        const user = await UserModel.findOne({ id: payload.id });
        if (user) {
          userPlan = user.planId;
        }
      }
    }

    const toolDocs = await ToolModel.find({ enabled: true }).lean();

    const tools = toolDocs.map((tool: any) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      minPlan: tool.minPlan,
      systemPrompt: tool.systemPrompt,
      iconName: tool.iconName,
      inputPlaceholder: tool.inputPlaceholder,
      samplePrompts: tool.samplePrompts || [],
      enabled: tool.enabled,
      availableModels: tool.availableModels || [],
      isAccessible: isPlanSufficient(userPlan as any, tool.minPlan),
    }));

    return NextResponse.json({
      tools,
      userPlan,
    });
  } catch (error) {
    console.error('Tools GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
  }
}
