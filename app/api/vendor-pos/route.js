import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';
import { todayISO } from '@/lib/date';

export async function POST(req) {
  const b = await req.json();
  if (!b.vendor_id || !b.item?.trim() || !b.qty_ordered) {
    return NextResponse.json({ error: 'vendor_id, item and qty required' }, { status: 400 });
  }
  const { lastId } = await execute(
    `INSERT INTO vendor_pos (vendor_id, order_id, project_id, item, qty_ordered, rate, ordered_on, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.vendor_id, b.order_id || null, b.project_id || null, b.item.trim(), b.qty_ordered,
     b.rate || null, b.ordered_on || todayISO(), b.notes || null]);
  return NextResponse.json({ id: lastId });
}
