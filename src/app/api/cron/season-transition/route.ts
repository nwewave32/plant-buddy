import { NextRequest, NextResponse } from 'next/server';

// POST /api/cron/season-transition — 계절 전환 처리
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: implement season transition logic
  return NextResponse.json({ transitioned: 0 });
}
