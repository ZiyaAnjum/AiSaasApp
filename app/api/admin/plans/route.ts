import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyToken, extractBearerToken } from '@/lib/auth';
import { PlanTier } from '@/lib/types';

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

    const { Plan: PlanModel } = await getDb();
    const plans = await PlanModel.find().lean();
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Admin plans GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden: Admin privilege required' }, { status: 403 });
    }

    const { Plan: PlanModel } = await getDb();
    const { id, price, dailyRequestLimit, maxUploadMb, features, allowedModels, description } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const plan = await PlanModel.findOne({ id: id as PlanTier });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    if (typeof price === 'number') plan.price = price;
    if (typeof dailyRequestLimit === 'number') plan.dailyRequestLimit = dailyRequestLimit;
    if (typeof maxUploadMb === 'number') plan.maxUploadMb = maxUploadMb;
    if (Array.isArray(features)) plan.features = features;
    if (Array.isArray(allowedModels)) plan.allowedModels = allowedModels;
    if (description) plan.description = description;

    await plan.save();

    return NextResponse.json({
      success: true,
      message: `Plan "${plan.name}" updated successfully`,
      plan,
    });
  } catch (error) {
    console.error('Admin plans PUT error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}
