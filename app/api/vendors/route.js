import { NextResponse } from 'next/server';
import { queryAll, execute } from '@/lib/db';

export async function GET() {
  const rows = await queryAll(`
    SELECT v.*,
      (SELECT COUNT(*) FROM vendor_pos vp WHERE vp.vendor_id = v.id AND vp.status = 'open') AS open_pos,
      (SELECT COUNT(*) FROM freight_charges f
        JOIN vendor_rates r ON r.vendor_id = f.vendor_id
          AND LOWER(r.from_loc) = LOWER(f.from_loc) AND LOWER(r.to_loc) = LOWER(f.to_loc)
        WHERE f.vendor_id = v.id AND f.amount > r.expected_amount) AS overcharges
    FROM vendors v
    ORDER BY v.name`);
  return NextResponse.json(rows);
}

export async function POST(req) {
  const b = await req.json();
  if (!b.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const { lastId } = await execute(
    'INSERT INTO vendors (name, phone, material, notes) VALUES (?, ?, ?, ?)',
    [b.name.trim(), b.phone || null, b.material || null, b.notes || null]);
  return NextResponse.json({ id: lastId });
}
