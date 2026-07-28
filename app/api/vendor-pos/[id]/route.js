import { NextResponse } from 'next/server';
import { execute, softDelete } from '@/lib/db';

export async function PUT(req, { params }) {
  const b = await req.json();
  await execute('UPDATE vendor_pos SET status = COALESCE(?, status), notes = COALESCE(?, notes) WHERE id = ?',
    [b.status ?? null, b.notes ?? null, params.id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  await softDelete('vendor_pos', params.id);
  return NextResponse.json({ ok: true });
}
