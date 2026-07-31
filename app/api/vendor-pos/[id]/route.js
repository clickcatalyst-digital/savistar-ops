import { NextResponse } from 'next/server';
import { execute, softDelete } from '@/lib/db';
import { getUserFromRequest, requireApprover } from '@/lib/auth';

export async function PUT(req, { params }) {
  const guard = requireApprover(getUserFromRequest(req));
  if (guard) return guard;
  const b = await req.json();
  await execute(
    `UPDATE vendor_pos SET item = ?, qty_ordered = ?, rate = ?, order_id = ?, project_id = ?,
       ordered_on = ?, notes = ?, status = ? WHERE id = ?`,
    [b.item, b.qty_ordered, b.rate || null, b.order_id || null, b.project_id || null,
     b.ordered_on || null, b.notes || null, b.status, params.id]);
  return NextResponse.json({ ok: true });
}

// Delete is open to any logged-in user (incl. staff) — only editing a PO's fields stays
// approver-only, per PUT above.
export async function DELETE(req, { params }) {
  await softDelete('vendor_pos', params.id);
  return NextResponse.json({ ok: true });
}
