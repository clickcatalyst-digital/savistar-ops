import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

export async function POST(req) {
  const b = await req.json();
  if (!b.vendor_id || !b.date || !b.from_loc?.trim() || !b.to_loc?.trim() || !b.amount) {
    return NextResponse.json({ error: 'vendor_id, date, from, to and amount required' }, { status: 400 });
  }
  const { lastId } = await execute(
    'INSERT INTO freight_charges (vendor_id, vendor_po_id, date, from_loc, to_loc, amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [b.vendor_id, b.vendor_po_id || null, b.date, b.from_loc.trim(), b.to_loc.trim(), b.amount, b.notes || null]);
  // Tell the caller immediately if this charge is above the rate card.
  const rate = await queryOne(
    `SELECT expected_amount FROM vendor_rates WHERE vendor_id = ? AND LOWER(from_loc) = LOWER(?)
       AND LOWER(to_loc) = LOWER(?) AND is_deleted_record = 0`,
    [b.vendor_id, b.from_loc.trim(), b.to_loc.trim()]);
  const overcharged = rate ? b.amount > rate.expected_amount : false;
  return NextResponse.json({ id: lastId, overcharged, expected_amount: rate?.expected_amount ?? null });
}
