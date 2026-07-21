import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';
import { getUserFromRequest, isStaff } from '@/lib/auth';

export async function PUT(req, { params }) {
  const user = getUserFromRequest(req);
  if (isStaff(user)) {
    const task = await queryOne('SELECT assigned_to FROM tasks WHERE id = ?', [params.id]);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (task.assigned_to !== user.username) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const b = await req.json();
  if (b.status === 'done') {
    await execute(`UPDATE tasks SET status = 'done', completed_at = CURRENT_TIMESTAMP WHERE id = ?`, [params.id]);
  } else if (b.status === 'open') {
    await execute(`UPDATE tasks SET status = 'open', completed_at = NULL WHERE id = ?`, [params.id]);
  }
  // Only owners/managers may reassign a task to someone else.
  const nextAssignedTo = isStaff(user) ? null : (b.assigned_to ?? null);
  if (b.title !== undefined || b.due_date !== undefined || nextAssignedTo !== null) {
    await execute(
      'UPDATE tasks SET title = COALESCE(?, title), due_date = COALESCE(?, due_date), assigned_to = COALESCE(?, assigned_to) WHERE id = ?',
      [b.title ?? null, b.due_date ?? null, nextAssignedTo, params.id]);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const user = getUserFromRequest(req);
  if (isStaff(user)) {
    const task = await queryOne('SELECT assigned_to FROM tasks WHERE id = ?', [params.id]);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (task.assigned_to !== user.username) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await execute('DELETE FROM tasks WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
