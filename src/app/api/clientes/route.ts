/**
 * /api/clientes — usa config_servicios con id=-4 (reservado para clientes)
 *
 * Guarda el array ClienteData[] como JSONB.
 * Mismo patrón que gastos-fijos (-1, -2) y combos (-3).
 * Sin autenticación Bearer — misma política que /api/admin/config y /api/sync.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const ID_CLIENTES = -4;

export async function GET() {
  try {
    const rows = await query<{ datos: unknown }>(
      'SELECT datos FROM config_servicios WHERE id = $1',
      [ID_CLIENTES]
    );
    return NextResponse.json({ ok: true, datos: rows[0]?.datos ?? [] });
  } catch (err) {
    console.error('[GET /api/clientes]', err);
    return NextResponse.json({ ok: false, datos: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { datos } = body as { datos?: unknown[] };
    if (!Array.isArray(datos)) {
      return NextResponse.json({ ok: false, error: 'datos debe ser un array' }, { status: 400 });
    }

    await query(
      `INSERT INTO config_servicios (id, datos, actualizado_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
      [ID_CLIENTES, JSON.stringify(datos)]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/clientes]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
