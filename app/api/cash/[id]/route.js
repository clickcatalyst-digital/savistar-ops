import { NextResponse } from 'next/server';
import { execute, softDelete } from '@/lib/db';
import { getUserFromRequest, requireApprover, requireNonStaff } from '@/lib/auth';

export async function PUT(req, { params }) {
  const guard = requireNonStaff(getUserFromRequest(req));
  if (guard) return guard;
  const b = await req.json();
  await execute(
    'UPDATE cash_transactions SET date = ?, kind = ?, amount = ?, party = ?, description = ? WHERE id = ?',
    [b.date, b.kind, b.amount, b.party || null, b.description || null, params.id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const guard = requireApprover(getUserFromRequest(req));
  if (guard) return guard;
  await softDelete('cash_transactions', params.id); // also hides its attachment rows
  return NextResponse.json({ ok: true });
}
