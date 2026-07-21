import { NextResponse } from 'next/server';
import { queryAll, execute } from '@/lib/db';

export async function GET() {
  const rows = await queryAll(`
    SELECT e.*,
      (SELECT a.status FROM attendance a WHERE a.employee_id = e.id AND a.date = date('now')) AS today_status,
      (SELECT o.item FROM work_logs w JOIN orders o ON o.id = w.order_id
        WHERE w.employee_id = e.id ORDER BY w.date DESC, w.id DESC LIMIT 1) AS last_order_item,
      (SELECT w.order_id FROM work_logs w WHERE w.employee_id = e.id AND w.order_id IS NOT NULL
        ORDER BY w.date DESC, w.id DESC LIMIT 1) AS last_order_id
    FROM employees e
    ORDER BY e.active DESC, e.name`);
  return NextResponse.json(rows);
}

export async function POST(req) {
  const b = await req.json();
  if (!b.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const { lastId } = await execute(
    'INSERT INTO employees (name, profession, phone, pay_type, pay_rate, joined_at) VALUES (?, ?, ?, ?, ?, ?)',
    [b.name.trim(), b.profession || null, b.phone || null, b.pay_type || 'daily', b.pay_rate || 0, b.joined_at || null]);
  return NextResponse.json({ id: lastId });
}
