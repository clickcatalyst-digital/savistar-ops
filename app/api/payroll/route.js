// Payroll for a month: computed from attendance × rate (daily) or flat salary, minus advances.
import { NextResponse } from 'next/server';
import { queryAll, execute } from '@/lib/db';
import { todayISO, todayMonth } from '@/lib/date';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || todayMonth();
  const rows = await queryAll(`
    SELECT e.id, e.name, e.profession, e.pay_type, e.pay_rate, e.active,
      COALESCE((SELECT SUM(CASE a.status WHEN 'present' THEN 1 WHEN 'half' THEN 0.5 ELSE 0 END)
        FROM attendance a WHERE a.employee_id = e.id AND strftime('%Y-%m', a.date) = ?
          AND a.is_deleted_record = 0), 0) AS days_present,
      COALESCE((SELECT SUM(x.amount) FROM employee_expenses x
        WHERE x.employee_id = e.id AND x.kind = 'advance' AND strftime('%Y-%m', x.date) = ?
          AND x.is_deleted_record = 0), 0) AS advances,
      (SELECT p.id FROM payroll_payments p WHERE p.employee_id = e.id AND p.period = ? AND p.is_deleted_record = 0) AS payment_id,
      (SELECT p.net FROM payroll_payments p WHERE p.employee_id = e.id AND p.period = ? AND p.is_deleted_record = 0) AS paid_net,
      (SELECT p.paid_on FROM payroll_payments p WHERE p.employee_id = e.id AND p.period = ? AND p.is_deleted_record = 0) AS paid_on
    FROM employees e
    WHERE e.is_deleted_record = 0
      AND (e.active = 1 OR (SELECT COUNT(*) FROM attendance a2 WHERE a2.employee_id = e.id
            AND strftime('%Y-%m', a2.date) = ? AND a2.is_deleted_record = 0) > 0)
    ORDER BY e.name`,
    [period, period, period, period, period, period]);
  const computed = rows.map(r => {
    const gross = r.pay_type === 'daily' ? r.days_present * r.pay_rate : r.pay_rate;
    return { ...r, gross, net: gross - r.advances };
  });
  return NextResponse.json({ period, rows: computed });
}

export async function POST(req) {
  const b = await req.json();
  if (!b.employee_id || !b.period) {
    return NextResponse.json({ error: 'employee_id and period required' }, { status: 400 });
  }
  const { lastId } = await execute(
    `INSERT INTO payroll_payments (employee_id, period, gross, deductions, net, paid_on, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [b.employee_id, b.period, b.gross || 0, b.deductions || 0, b.net || 0,
     b.paid_on || todayISO(), b.notes || null]);
  return NextResponse.json({ id: lastId });
}
