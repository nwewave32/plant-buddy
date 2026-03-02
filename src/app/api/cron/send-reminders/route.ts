import { NextRequest, NextResponse } from 'next/server';

// POST /api/cron/send-reminders — 물주기 알림 발송
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // TODO: implement reminder logic
  return NextResponse.json({ sent: 0 });
}
