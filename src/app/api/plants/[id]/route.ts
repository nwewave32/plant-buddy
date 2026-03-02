import { NextResponse } from 'next/server';

// GET /api/plants/[id] — 식물 상세
export async function GET() {
  // TODO: implement
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 });
}

// PATCH /api/plants/[id] — 식물 수정
export async function PATCH() {
  // TODO: implement
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 });
}

// DELETE /api/plants/[id] — 식물 삭제 (admin)
export async function DELETE() {
  // TODO: implement
  return NextResponse.json({ message: 'Not implemented' }, { status: 501 });
}
