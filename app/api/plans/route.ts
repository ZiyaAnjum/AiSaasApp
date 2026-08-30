import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const { Plan: PlanModel } = await getDb();
    const plans = await PlanModel.find().lean();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Plans GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}
