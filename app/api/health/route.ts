import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectToDatabase();
    const readyState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    const dbName = mongoose.connection.db?.databaseName || 'default';

    return NextResponse.json({
      status: readyState === 1 ? 'ok' : 'degraded',
      mongoStatus: states[readyState] || 'unknown',
      database: dbName,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: error.message || 'Database connection failed',
      },
      { status: 500 }
    );
  }
}
