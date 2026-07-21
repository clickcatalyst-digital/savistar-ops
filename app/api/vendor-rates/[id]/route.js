import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function DELETE(req, { params }) {
  await execute('DELETE FROM vendor_rates WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
