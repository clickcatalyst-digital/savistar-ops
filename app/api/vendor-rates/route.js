import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function POST(req) {
  const b = await req.json();
  if (!b.vendor_id || !b.from_loc?.trim() || !b.to_loc?.trim() || !b.expected_amount) {
    return NextResponse.json({ error: 'vendor_id, from, to and expected amount required' }, { status: 400 });
  }
  await execute(
    `INSERT INTO vendor_rates (vendor_id, from_loc, to_loc, expected_amount) VALUES (?, ?, ?, ?)
     ON CONFLICT(vendor_id, from_loc, to_loc) DO UPDATE SET expected_amount = excluded.expected_amount`,
    [b.vendor_id, b.from_loc.trim(), b.to_loc.trim(), b.expected_amount]);
  return NextResponse.json({ ok: true });
}
