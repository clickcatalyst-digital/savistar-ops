// Upsert one employee's attendance for a day (UNIQUE(employee_id, date)).
import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function POST(req) {
  const b = await req.json();
  if (!b.employee_id || !b.date) {
    return NextResponse.json({ error: 'employee_id and date required' }, { status: 400 });
  }
  await execute(
    `INSERT INTO attendance (employee_id, date, status, in_time, out_time) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(employee_id, date) DO UPDATE SET status = excluded.status, in_time = excluded.in_time,
       out_time = excluded.out_time, is_deleted_record = 0`,
    [b.employee_id, b.date, b.status || 'present', b.in_time || null, b.out_time || null]);
  return NextResponse.json({ ok: true });
}
