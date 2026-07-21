// Active users any authenticated person can assign a task to — no role/password exposed.
import { NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';

export async function GET() {
  const rows = await queryAll(
    'SELECT id, username, display_name FROM users WHERE active = 1 ORDER BY display_name, username');
  return NextResponse.json(rows);
}
