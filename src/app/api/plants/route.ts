import { NextResponse } from 'next/server';

// GET /api/plants — 식물 목록
export async function GET() {
  // TODO: implement
  return NextResponse.json({ plants: [] });
}

// POST /api/plants — 식물 등록 (admin)
export async function POST() {
  // TODO: implement
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 });
}
