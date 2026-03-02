import { NextResponse } from 'next/server';

// GET /api/plants/[id]/presets — 4계절 프리셋 조회
export async function GET() {
  // TODO: implement
  return NextResponse.json({ presets: [] });
}

// PUT /api/plants/[id]/presets — 프리셋 일괄 upsert (admin)
export async function PUT() {
  // TODO: implement
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 });
}
