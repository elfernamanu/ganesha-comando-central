import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarToken } from '@/lib/auth';

// GET /api/combos
export async function GET(req: NextRequest) {
  const err = verificarToken(req);
  if (err) return err;
  try {
    const rows = await query<{ datos: unknown }>(
      'SELECT datos FROM combos ORDER BY id DESC LIMIT 1'
    );
    return NextResponse.json({ ok: true, datos: rows[0]?.datos ?? [] });
  } catch (err) {
    console.error('[GET /api/combos]', err);
    return NextResponse.json({ ok: false, datos: [] }, { status: 500 });
  }
}

// POST /api/combos → { datos }
export async function POST(req: NextRequest) {
  const err = verificarToken(req);
  if (err) return err;
  try {
    const body = await req.json();
    const { datos } = body;
    if (!datos) return NextResponse.json({ ok: false }, { status: 400 });

    await query(
      'UPDATE combos SET datos = $1::jsonb, actualizado_at = NOW()',
      [JSON.stringify(datos)]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/combos]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
