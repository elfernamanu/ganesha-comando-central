/**
 * /api/combos — reutiliza config_servicios con id=-3 (reservado para combos)
 *
 * No requiere tabla separada — mismo patrón que gastos-fijos (-1 empresa, -2 personal).
 * Guarda el array Combo[] completo como JSONB.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guardarBackup } from '@/lib/backup';

const ID_COMBOS = -3;

export async function GET() {
  try {
    const rows = await query<{ datos: unknown }>(
      'SELECT datos FROM config_servicios WHERE id = $1',
      [ID_COMBOS]
    );
    return NextResponse.json({ ok: true, datos: rows[0]?.datos ?? [] });
  } catch (err) {
    console.error('[GET /api/combos]', err);
    return NextResponse.json({ ok: false, datos: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { datos, forzar } = body as { datos?: unknown[]; forzar?: boolean };
    if (!Array.isArray(datos)) {
      return NextResponse.json({ ok: false, error: 'datos debe ser un array' }, { status: 400 });
    }

    // Protección: rechazar array vacío si ya hay combos guardados
    if (!forzar) {
      const existing = await query<{ cant: string }>(
        `SELECT jsonb_array_length(datos)::text AS cant FROM config_servicios WHERE id = $1`,
        [ID_COMBOS]
      ).catch(() => []);
      const cantExistente = parseInt((existing as { cant: string }[])[0]?.cant ?? '0', 10);
      if (cantExistente > 0 && datos.length === 0) {
        return NextResponse.json({
          ok: false, protegido: true,
          error: `Protección activa: hay ${cantExistente} combo${cantExistente !== 1 ? 's' : ''} guardados. No se puede guardar vacío.`,
        }, { status: 409 });
      }
    }

    const prev = await query<{ datos: unknown }>('SELECT datos FROM config_servicios WHERE id = $1', [ID_COMBOS]).catch(() => []);
    if ((prev as { datos: unknown }[])[0]?.datos) await guardarBackup('combos', '1', (prev as { datos: unknown }[])[0].datos);

    await query(
      `INSERT INTO config_servicios (id, datos, actualizado_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
      [ID_COMBOS, JSON.stringify(datos)]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/combos]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
