import { NextResponse } from 'next/server';

// POST /api/delegations — 위임 요청
export async function POST() {
  // TODO: implement
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 });
}

// GET /api/delegations — 내 위임 목록
export async function GET() {
  // TODO: implement
  return NextResponse.json({ delegations: [] });
}
