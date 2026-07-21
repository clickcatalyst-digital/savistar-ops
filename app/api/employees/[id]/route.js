import { NextResponse } from 'next/server';
import { queryAll, queryOne, execute } from '@/lib/db';
import { getUserFromRequest, requireApprover } from '@/lib/auth';
import { todayMonth } from '@/lib/date';

export async function GET(req, { params }) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') || todayMonth();
  const emp = await queryOne('SELECT * FROM employees WHERE id = ?', [params.id]);
  if (!emp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [attendance, workLogs, expenses, payments] = await Promise.all([
    queryAll(`SELECT * FROM attendance WHERE employee_id = ? AND strftime('%Y-%m', date) = ? ORDER BY date DESC`, [params.id, month]),
    queryAll(`SELECT w.*, o.item AS order_item FROM work_logs w
              LEFT JOIN orders o ON o.id = w.order_id
              WHERE w.employee_id = ? AND strftime('%Y-%m', w.date) = ? ORDER BY w.date DESC, w.id DESC`, [params.id, month]),
    queryAll(`SELECT * FROM employee_expenses WHERE employee_id = ? ORDER BY date DESC LIMIT 50`, [params.id]),
    queryAll(`SELECT * FROM payroll_payments WHERE employee_id = ? ORDER BY period DESC`, [params.id]),
  ]);
  return NextResponse.json({ ...emp, month, attendance, workLogs, expenses, payments });
}

export async function PUT(req, { params }) {
  const b = await req.json();
  await execute(
    `UPDATE employees SET name = ?, profession = ?, phone = ?, pay_type = ?, pay_rate = ?, active = ?, joined_at = ? WHERE id = ?`,
    [b.name, b.profession || null, b.phone || null, b.pay_type, b.pay_rate || 0,
     b.active === false || b.active === 0 ? 0 : 1, b.joined_at || null, params.id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const guard = requireApprover(getUserFromRequest(req));
  if (guard) return guard;
  await execute('DELETE FROM employees WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
