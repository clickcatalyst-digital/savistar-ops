import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

// Record a partial delivery and/or return against a PO. Auto-completes the PO
// when everything ordered has been delivered (net of returns).
export async function POST(req, { params }) {
  const b = await req.json();
  if (!b.date || (!b.qty_delivered && !b.qty_returned)) {
    return NextResponse.json({ error: 'date and a delivered or returned qty required' }, { status: 400 });
  }
  await execute(
    'INSERT INTO vendor_deliveries (vendor_po_id, date, qty_delivered, qty_returned, notes) VALUES (?, ?, ?, ?, ?)',
    [params.id, b.date, b.qty_delivered || 0, b.qty_returned || 0, b.notes || null]);
  const totals = await queryOne(
    `SELECT vp.qty_ordered,
       COALESCE(SUM(d.qty_delivered), 0) AS delivered, COALESCE(SUM(d.qty_returned), 0) AS returned
     FROM vendor_pos vp LEFT JOIN vendor_deliveries d ON d.vendor_po_id = vp.id AND d.is_deleted_record = 0
     WHERE vp.id = ? GROUP BY vp.id`, [params.id]);
  const outstanding = totals.qty_ordered - totals.delivered + totals.returned;
  await execute('UPDATE vendor_pos SET status = ? WHERE id = ? AND status != ?',
    [outstanding <= 0 ? 'complete' : 'open', params.id, 'cancelled']);
  return NextResponse.json({ ok: true, outstanding });
}
