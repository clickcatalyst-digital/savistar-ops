import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { execute } from '@/lib/db';
import { getUserFromRequest, requireApprover } from '@/lib/auth';

export async function PUT(req, { params }) {
  const user = getUserFromRequest(req);
  const guard = requireApprover(user);
  if (guard) return guard;
  const b = await req.json();
  if (b.password) {
    await execute('UPDATE users SET password = ? WHERE id = ?', [bcrypt.hashSync(b.password, 10), params.id]);
  }
  await execute(
    'UPDATE users SET role = COALESCE(?, role), display_name = COALESCE(?, display_name), active = COALESCE(?, active) WHERE id = ?',
    [b.role ?? null, b.display_name ?? null, b.active === undefined ? null : (b.active ? 1 : 0), params.id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = getUserFromRequest(req);
  const guard = requireApprover(user);
  if (guard) return guard;
  if (Number(params.id) === user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }
  await execute('DELETE FROM users WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
