import { NextResponse } from 'next/server';
import { queryAll, execute } from '@/lib/db';
import { getUserFromRequest, requireNonStaff } from '@/lib/auth';

export async function GET(req) {
  const guard = requireNonStaff(getUserFromRequest(req));
  if (guard) return guard;
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // optional YYYY-MM filter
  const where = month ? `WHERE strftime('%Y-%m', date) = ?` : '';
  const args = month ? [month] : [];
  const [rows, totals] = await Promise.all([
    queryAll(`SELECT t.*,
        (SELECT COUNT(*) FROM attachments a WHERE a.entity_type = 'cash_transaction' AND a.entity_id = t.id) AS attachment_count
      FROM cash_transactions t ${where} ORDER BY t.date DESC, t.id DESC`, args),
    queryAll(`SELECT
        COALESCE(SUM(CASE WHEN kind = 'credit' THEN amount END), 0) AS total_credit,
        COALESCE(SUM(CASE WHEN kind = 'debit' THEN amount END), 0) AS total_debit
      FROM cash_transactions`),
  ]);
  const balance = totals[0].total_credit - totals[0].total_debit;
  return NextResponse.json({ rows, balance, ...totals[0] });
}

export async function POST(req) {
  const user = getUserFromRequest(req);
  const guard = requireNonStaff(user);
  if (guard) return guard;
  const b = await req.json();
  if (!b.date || !b.kind || !b.amount) {
    return NextResponse.json({ error: 'date, kind and amount required' }, { status: 400 });
  }
  if (!['credit', 'debit'].includes(b.kind)) {
    return NextResponse.json({ error: 'kind must be credit or debit' }, { status: 400 });
  }
  const { lastId } = await execute(
    'INSERT INTO cash_transactions (date, kind, amount, party, description, created_by) VALUES (?, ?, ?, ?, ?, ?)',
    [b.date, b.kind, b.amount, b.party || null, b.description || null, user?.username || null]);
  return NextResponse.json({ id: lastId });
}
