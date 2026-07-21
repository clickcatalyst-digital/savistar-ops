// Generic file attachments: upload to R2, link to any entity (cash_transaction, order, …).
import { NextResponse } from 'next/server';
import { queryAll, queryOne, execute } from '@/lib/db';
import { uploadToR2, deleteFromR2, isR2Configured } from '@/lib/r2';
import { getUserFromRequest, requireNonStaff } from '@/lib/auth';

// Cash-transaction attachments are financial data — staff can attach files to orders,
// site visits, etc. through this same generic endpoint, just not to cash transactions.
function guardCashEntity(user, entityType) {
  return entityType === 'cash_transaction' ? requireNonStaff(user) : null;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('entity_type');
  const id = searchParams.get('entity_id');
  if (!type || !id) return NextResponse.json({ error: 'entity_type and entity_id required' }, { status: 400 });
  const guard = guardCashEntity(getUserFromRequest(req), type);
  if (guard) return guard;
  const rows = await queryAll(
    'SELECT * FROM attachments WHERE entity_type = ? AND entity_id = ? ORDER BY id DESC', [type, id]);
  return NextResponse.json(rows);
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'File storage not configured (R2_* env vars missing)' }, { status: 503 });
  }
  const form = await req.formData();
  const file = form.get('file');
  const entityType = form.get('entity_type');
  const entityId = form.get('entity_id');
  if (!file || !entityType || !entityId) {
    return NextResponse.json({ error: 'file, entity_type and entity_id required' }, { status: 400 });
  }
  const guard = guardCashEntity(user, entityType);
  if (guard) return guard;
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Max file size is 20 MB' }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const url = await uploadToR2(buffer, file.name, file.type);
  const { lastId } = await execute(
    'INSERT INTO attachments (entity_type, entity_id, file_url, name, uploaded_by) VALUES (?, ?, ?, ?, ?)',
    [entityType, entityId, url, file.name, user?.username || null]);
  return NextResponse.json({ id: lastId, file_url: url, name: file.name });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const row = await queryOne('SELECT * FROM attachments WHERE id = ?', [id]);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const guard = guardCashEntity(getUserFromRequest(req), row.entity_type);
  if (guard) return guard;
  try { await deleteFromR2(row.file_url); } catch { /* R2 object may already be gone */ }
  await execute('DELETE FROM attachments WHERE id = ?', [id]);
  return NextResponse.json({ ok: true });
}
