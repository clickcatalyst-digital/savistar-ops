// app/api/site-visits/[id]/route.js

import { NextResponse } from 'next/server';
import { softDelete } from '@/lib/db';

export async function DELETE(req, { params }) {
  await softDelete('site_visits', params.id);
  return NextResponse.json({ ok: true });
}
