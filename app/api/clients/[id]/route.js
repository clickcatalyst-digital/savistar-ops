import { NextResponse } from 'next/server';
import { queryAll, queryOne, execute } from '@/lib/db';
import { getUserFromRequest, requireApprover } from '@/lib/auth';

export async function GET(req, { params }) {
  const client = await queryOne('SELECT * FROM clients WHERE id = ?', [params.id]);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [conversations, projects, orders] = await Promise.all([
    queryAll(`SELECT cc.*, p.name AS project_name FROM client_conversations cc
              LEFT JOIN projects p ON p.id = cc.project_id
              WHERE cc.client_id = ? ORDER BY cc.created_at DESC`, [params.id]),
    queryAll('SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC', [params.id]),
    queryAll('SELECT * FROM orders WHERE client_id = ? ORDER BY created_at DESC', [params.id]),
  ]);
  return NextResponse.json({ ...client, conversations, projects, orders });
}

export async function PUT(req, { params }) {
  const b = await req.json();
  await execute(
    'UPDATE clients SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?',
    [b.name, b.phone || null, b.email || null, b.address || null, b.notes || null, params.id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const guard = requireApprover(getUserFromRequest(req));
  if (guard) return guard;
  await execute('DELETE FROM clients WHERE id = ?', [params.id]);
  return NextResponse.json({ ok: true });
}
