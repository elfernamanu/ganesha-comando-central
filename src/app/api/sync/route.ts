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
    const rows = await query<{ datos: unknown; actualizado_at: string }>(
      'SELECT datos, actualizado_at FROM turnos WHERE fecha = $1',
      [fecha]
    );
    return NextResponse.json({
      ok: true,
      datos: rows[0]?.datos ?? [],
      actualizado_at: rows[0]?.actualizado_at ?? null,
    }, {
      headers: { 'Cache-Control': 'no-store' },
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

// POST /api/sync  →  { fecha, datos: Turno[], forzar?: boolean }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fecha, datos, forzar } = body;
    if (!fecha || !Array.isArray(datos)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // ── PROTECCIÓN CRÍTICA ────────────────────────────────────────────────────
    // Si el cliente manda datos vacíos Y el servidor ya tiene turnos guardados
    // → rechazar el guardado. Evita que cualquier dispositivo sin caché
    // pise datos reales con una lista vacía.
    // Para borrar todos los turnos intencionalmente usar forzar: true.
    if (!forzar) {
      const existing = await query<{ cant: string }>(
        `SELECT jsonb_array_length(datos)::text AS cant FROM turnos WHERE fecha = $1`,
        [fecha]
      );
      const cantExistente = parseInt(existing[0]?.cant ?? '0', 10);
      if (cantExistente > 0 && datos.length === 0) {
        return NextResponse.json({
          ok: false,
          protegido: true,
          error: `Protección activa: hay ${cantExistente} turno${cantExistente !== 1 ? 's' : ''} guardados en el servidor para ${fecha}. No se puede guardar vacío.`,
        }, { status: 409 });
      }
      if (cantExistente > datos.length && datos.length > 0) {
        return NextResponse.json({
          ok: false,
          protegido: true,
          parcial: true,
          cantServidor: cantExistente,
          cantEnviados: datos.length,
          error: `Protección activa: el servidor tiene ${cantExistente} turnos para ${fecha} pero se enviaron solo ${datos.length}. Para sobrescribir usar forzar: true.`,
        }, { status: 409 });
      }
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
