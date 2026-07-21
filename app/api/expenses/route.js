import { NextResponse } from 'next/server';
import { execute } from '@/lib/db';

export async function POST(req) {
  const b = await req.json();
  if (!b.employee_id || !b.date || !b.amount) {
    return NextResponse.json({ error: 'employee_id, date and amount required' }, { status: 400 });
  }
  const { lastId } = await execute(
    'INSERT INTO employee_expenses (employee_id, date, kind, amount, description) VALUES (?, ?, ?, ?, ?)',
    [b.employee_id, b.date, b.kind || 'advance', b.amount, b.description || null]);
  return NextResponse.json({ id: lastId });
}
