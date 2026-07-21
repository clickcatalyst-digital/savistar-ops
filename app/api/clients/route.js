import { NextResponse } from 'next/server';
import { queryAll, execute } from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');
  const where = q ? `WHERE c.name LIKE ? OR c.phone LIKE ?` : '';
  const args = q ? [`%${q}%`, `%${q}%`] : [];
  const rows = await queryAll(`
    SELECT c.*,
      (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) AS projects_count,
      (SELECT COUNT(*) FROM orders o WHERE o.client_id = c.id) AS orders_count
    FROM clients c ${where}
    ORDER BY c.created_at DESC`, args);
  return NextResponse.json(rows);
}

export async function POST(req) {
  const b = await req.json();
  if (!b.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const { lastId } = await execute(
    'INSERT INTO clients (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
    [b.name.trim(), b.phone || null, b.email || null, b.address || null, b.notes || null]);
  return NextResponse.json({ id: lastId });
}
