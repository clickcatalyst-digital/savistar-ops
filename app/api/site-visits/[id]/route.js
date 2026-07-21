import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function DELETE(req, { params }) {
  await execute('DELETE FROM site_visits WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
