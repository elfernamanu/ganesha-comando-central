import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/admin/config
 * Guarda la configuración de servicios. Siempre 1 sola fila (id=1).
 * Limpia automáticamente filas basura de versiones anteriores.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { datos } = body;
    if (!datos) return NextResponse.json({ ok: false, error: 'Sin datos' }, { status: 400 });

    const json = JSON.stringify(datos);

    // UPSERT: siempre id=1, 1 sola fila, nunca acumula
    await query(
      `INSERT INTO config_servicios (id, datos, actualizado_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id)
       DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = EXCLUDED.actualizado_at`,
      [json]
    );

    // Solo limpia filas positivas que no son id=1 (basura de versiones anteriores)
    // IMPORTANTE: NO borrar filas con id negativo — son datos del sistema:
    //   id=-1 gastos fijos empresa, id=-2 gastos fijos personal,
    //   id=-3 combos, id=-4 clientes con teléfonos
    await query('DELETE FROM config_servicios WHERE id > 1');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/admin/config]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/**
 * GET /api/admin/config
 * Lee siempre la fila id=1.
 * Cache 60s en CDN + stale-while-revalidate 5min → respuesta inmediata en navegaciones repetidas.
 */
export async function GET() {
  try {
    const rows = await query<{ datos: unknown }>(
      'SELECT datos FROM config_servicios WHERE id = 1'
    );
    const datos = rows[0]?.datos ?? [];
    return NextResponse.json({ ok: true, datos }, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[GET /api/admin/config]', err);
    return NextResponse.json({ ok: false, datos: [] }, { status: 500 });
  }
}
