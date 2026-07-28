// The owner's daily worksheet: every active employee with that day's attendance + work logs.
import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { todayISO } from '@/lib/date';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || todayISO();
  const [employees, attendance, workLogs] = await Promise.all([
    queryAll('SELECT * FROM employees WHERE active = 1 AND is_deleted_record = 0 ORDER BY name'),
    queryAll('SELECT * FROM attendance WHERE date = ? AND is_deleted_record = 0', [date]),
    queryAll(`SELECT w.*, o.item AS order_item FROM work_logs w
              LEFT JOIN orders o ON o.id = w.order_id
              WHERE w.date = ? AND w.is_deleted_record = 0 ORDER BY w.id`, [date]),
  ]);
  const attByEmp = Object.fromEntries(attendance.map(a => [a.employee_id, a]));
  const logsByEmp = {};
  for (const w of workLogs) (logsByEmp[w.employee_id] ||= []).push(w);
  return NextResponse.json({
    date,
    rows: employees.map(e => ({
      employee: e,
      attendance: attByEmp[e.id] || null,
      workLogs: logsByEmp[e.id] || [],
    })),
  });
}
