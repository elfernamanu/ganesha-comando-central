import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/config → devuelve la configuración de servicios
export async function GET() {
  try {
    const rows = await query<{ datos: unknown }>(
      'SELECT datos FROM config_servicios ORDER BY id DESC LIMIT 1'
    );
    const datos = rows[0]?.datos ?? [];
    return NextResponse.json({ ok: true, datos });
  } catch (err) {
    console.error('[GET /api/config]', err);
    return NextResponse.json({ ok: false, datos: [] }, { status: 500 });
  }
}

// POST /api/config → guarda la configuración de servicios
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { datos } = body;
    if (!datos) return NextResponse.json({ ok: false }, { status: 400 });

    await query(
      `INSERT INTO config_servicios (datos, actualizado_at)
       VALUES ($1::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [JSON.stringify(datos)]
    );
    // Siempre tenemos 1 sola fila → UPDATE
    await query(
      'UPDATE config_servicios SET datos = $1::jsonb, actualizado_at = NOW()',
      [JSON.stringify(datos)]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/config]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
