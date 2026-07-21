import { NextResponse } from 'next/server';
import { queryAll, execute } from '@/lib/db';
import { getUserFromRequest, isStaff } from '@/lib/auth';

export async function GET(req) {
  const user = getUserFromRequest(req);
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get('scope') || 'today';
  // Staff only ever see their own tasks; owners/managers see everyone's.
  const mineOnly = isStaff(user);
  if (scope === 'range') {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const rows = await queryAll(`
      SELECT t.*, c.name AS client_name FROM tasks t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE t.due_date BETWEEN ? AND ? ${mineOnly ? 'AND t.assigned_to = ?' : ''}
      ORDER BY t.due_date, t.id`, mineOnly ? [from, to, user.username] : [from, to]);
    return NextResponse.json(rows);
  }
  // today + overdue open tasks
  const rows = await queryAll(`
    SELECT t.*, c.name AS client_name FROM tasks t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE t.status = 'open' AND t.due_date <= date('now') ${mineOnly ? 'AND t.assigned_to = ?' : ''}
    ORDER BY t.due_date, t.id`, mineOnly ? [user.username] : []);
  return NextResponse.json(rows);
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  const b = await req.json();
  if (!b.title?.trim() || !b.due_date) {
    return NextResponse.json({ error: 'title and due_date required' }, { status: 400 });
  }
  // Staff can only create tasks for themselves — ignore any assignee they send.
  const assignedTo = isStaff(user) ? user.username : (b.assigned_to || user?.username || null);
  const { lastId } = await execute(
    'INSERT INTO tasks (title, due_date, assigned_to, client_id, created_by) VALUES (?, ?, ?, ?, ?)',
    [b.title.trim(), b.due_date, assignedTo, b.client_id || null, user?.username || null]);
  return NextResponse.json({ id: lastId });
}
