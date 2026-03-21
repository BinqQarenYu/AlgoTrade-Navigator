
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const ip = request.ip || '127.0.0.1';
  return NextResponse.json({ ip });
}
