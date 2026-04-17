/**
 * /api/sync — Sincronización de turnos entre dispositivos
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/sync?fecha=2026-04-14
// Cache 20s: el cliente ya tiene localStorage; el server confirma cambios recientes.
export async function GET(req: NextRequest) {
  const fecha = req.nextUrl.searchParams.get('fecha');
  if (!fecha) return NextResponse.json({ ok: false, datos: [] });

  try {
    const rows = await query<{ datos: unknown }>(
      'SELECT datos FROM turnos WHERE fecha = $1',
      [fecha]
    );
    return NextResponse.json({ ok: true, datos: rows[0]?.datos ?? [] }, {
      headers: {
        'Cache-Control': 'private, max-age=20, stale-while-revalidate=60',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, datos: [] });
  }
}

// DELETE /api/sync?antes_de=2026-04-16  → borra turnos con fecha < ese valor
export async function DELETE(req: NextRequest) {
  const antes_de = req.nextUrl.searchParams.get('antes_de');
  if (!antes_de) return NextResponse.json({ ok: false, error: 'Falta antes_de' }, { status: 400 });

  try {
    const result = await query<{ count: string }>(
      `WITH deleted AS (
         DELETE FROM turnos WHERE fecha < $1 RETURNING fecha
       )
       SELECT count(*)::text AS count FROM deleted`,
      [antes_de]
    );
    const borrados = parseInt(result[0]?.count ?? '0', 10);
    return NextResponse.json({ ok: true, borrados, mensaje: `${borrados} día${borrados !== 1 ? 's' : ''} de turnos eliminado${borrados !== 1 ? 's' : ''}` });
  } catch (err) {
    console.error('[/api/sync DELETE]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// POST /api/sync  →  { fecha, datos: Turno[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fecha, datos } = body;
    if (!fecha || !Array.isArray(datos)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await query(
      `INSERT INTO turnos (fecha, datos, actualizado_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (fecha) DO UPDATE
         SET datos         = EXCLUDED.datos,
             actualizado_at = NOW()`,
      [fecha, JSON.stringify(datos)]
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
