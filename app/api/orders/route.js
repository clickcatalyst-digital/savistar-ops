import { NextResponse } from 'next/server';
import { queryAll, execute } from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const where = status && status !== 'all' ? 'AND o.status = ?' : '';
  const args = status && status !== 'all' ? [status] : [];
  const rows = await queryAll(`
    SELECT o.*, c.name AS client_name, p.name AS project_name,
      (SELECT GROUP_CONCAT(DISTINCT e.name) FROM work_logs w JOIN employees e ON e.id = w.employee_id
        WHERE w.order_id = o.id AND w.date >= date('now', '-7 days')
          AND w.is_deleted_record = 0 AND e.is_deleted_record = 0) AS recent_workers
    FROM orders o
    LEFT JOIN clients c ON c.id = o.client_id
    LEFT JOIN projects p ON p.id = o.project_id
    WHERE o.is_deleted_record = 0 ${where}
    ORDER BY o.status IN ('pending','in_progress') DESC, o.due_date IS NULL, o.due_date, o.created_at DESC`, args);
  return NextResponse.json(rows);
}

export async function POST(req) {
  const b = await req.json();
  if (!b.item?.trim()) return NextResponse.json({ error: 'Item is required' }, { status: 400 });
  const { lastId } = await execute(
    `INSERT INTO orders (client_id, project_id, item, qty, description, status, start_date, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [b.client_id || null, b.project_id || null, b.item.trim(), b.qty || 1, b.description || null,
     b.status || 'pending', b.start_date || null, b.due_date || null]);
  return NextResponse.json({ id: lastId });
}
