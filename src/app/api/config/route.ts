import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarToken } from '@/lib/auth';

// GET /api/config → devuelve la configuración de servicios
export async function GET(req: NextRequest) {
  const err = verificarToken(req);
  if (err) return err;
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
  const err = verificarToken(req);
  if (err) return err;
  try {
    const body = await req.json();
    const { datos } = body;
    if (!datos) return NextResponse.json({ ok: false }, { status: 400 });

    const json = JSON.stringify(datos);

    // UPSERT: una sola operación atómica
    await query(
      `INSERT INTO config_servicios (id, datos, actualizado_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id)
       DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = EXCLUDED.actualizado_at`,
      [json]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/config]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
