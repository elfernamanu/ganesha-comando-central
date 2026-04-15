import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/admin/config
 * Guarda la configuración de servicios desde el panel de administración.
 * No requiere token externo — el panel ya tiene autenticación por PIN.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { datos } = body;
    if (!datos) return NextResponse.json({ ok: false, error: 'Sin datos' }, { status: 400 });

    const json = JSON.stringify(datos);

    // Intenta actualizar la fila existente
    const updated = await query<{ id: number }>(
      'UPDATE config_servicios SET datos = $1::jsonb, actualizado_at = NOW() RETURNING id',
      [json]
    );

    // Si no había fila, la crea
    if (updated.length === 0) {
      await query(
        'INSERT INTO config_servicios (datos, actualizado_at) VALUES ($1::jsonb, NOW())',
        [json]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/admin/config]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

/**
 * GET /api/admin/config
 * Lee la configuración de servicios desde la base de datos.
 */
export async function GET() {
  try {
    const rows = await query<{ datos: unknown }>(
      'SELECT datos FROM config_servicios ORDER BY id DESC LIMIT 1'
    );
    const datos = rows[0]?.datos ?? [];
    return NextResponse.json({ ok: true, datos });
  } catch (err) {
    console.error('[GET /api/admin/config]', err);
    return NextResponse.json({ ok: false, datos: [] }, { status: 500 });
  }
}
