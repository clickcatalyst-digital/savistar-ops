import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function PUT(req, { params }) {
  const b = await req.json();
  if (b.status !== undefined) {
    await execute(
      `UPDATE milestones SET status = ?, completed_at = CASE WHEN ? = 'done' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?`,
      [b.status, b.status, params.id]);
  }
  if (b.title !== undefined || b.due_date !== undefined) {
    await execute('UPDATE milestones SET title = COALESCE(?, title), due_date = ? WHERE id = ?',
      [b.title ?? null, b.due_date ?? null, params.id]);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  await execute('DELETE FROM milestones WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
