import { NextResponse } from 'next/server';
import { softDelete } from '@/lib/db';

export async function DELETE(req, { params }) {
  await softDelete('vendor_rates', params.id);
  return NextResponse.json({ ok: true });
}
