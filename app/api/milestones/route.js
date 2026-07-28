import { NextResponse } from 'next/server';
import { queryOne, execute } from '@/lib/db';

export async function POST(req) {
  const b = await req.json();
  if (!b.project_id || !b.title?.trim()) {
    return NextResponse.json({ error: 'project_id and title required' }, { status: 400 });
  }
  const max = await queryOne(
    'SELECT COALESCE(MAX(sort_order), 0) AS m FROM milestones WHERE project_id = ? AND is_deleted_record = 0',
    [b.project_id]);
  const { lastId } = await execute(
    'INSERT INTO milestones (project_id, title, due_date, sort_order) VALUES (?, ?, ?, ?)',
    [b.project_id, b.title.trim(), b.due_date || null, max.m + 1]);
  return NextResponse.json({ id: lastId });
}
