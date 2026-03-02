import { NextResponse } from 'next/server';

// GET /api/plants/[id]/watering-logs — 물주기 이력
export async function GET() {
  // TODO: implement
  return NextResponse.json({ logs: [] });
}
