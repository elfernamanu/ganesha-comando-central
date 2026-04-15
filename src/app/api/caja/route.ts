/**
 * /api/caja — Persistencia de cierre de caja en PostgreSQL
 *
 * GET  /api/caja?fecha=2026-04-24   → recupera cierre del día
 * POST /api/caja                    → guarda/actualiza cierre del día
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// ── Asegura que la tabla existe — solo UNA vez por proceso/instancia ──────
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS caja_diaria (
      fecha        DATE        PRIMARY KEY,
      datos        JSONB       NOT NULL DEFAULT '{}',
      cerrada      BOOLEAN     NOT NULL DEFAULT false,
      actualizado  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  tableReady = true;
}

// ── GET: recuperar cierre ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const fecha = req.nextUrl.searchParams.get('fecha');
  if (!fecha) return NextResponse.json({ ok: false, error: 'Falta fecha' }, { status: 400 });

  try {
    await ensureTable();
    const rows = await query<{ datos: unknown; cerrada: boolean }>(
      'SELECT datos, cerrada FROM caja_diaria WHERE fecha = $1',
      [fecha]
    );
    if (!rows[0]) return NextResponse.json({ ok: false, encontrado: false });

    const datos = rows[0].datos as Record<string, unknown>;
    return NextResponse.json({
      ok: true,
      encontrado: true,
      cerrada: rows[0].cerrada,
      turnos:  datos.turnos  ?? [],
      gastos:  datos.gastos  ?? [],
      totales: datos.totales ?? null,
    });
  } catch (err) {
    console.error('[/api/caja GET]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// ── POST: guardar/cerrar caja ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fecha, turnos, gastos, totales, estado, gastosFijosEmpresa, gastosFijosPersonal } = body;

    if (!fecha) return NextResponse.json({ ok: false, error: 'Falta fecha' }, { status: 400 });

    await ensureTable();

    const datos = {
      turnos:               turnos               ?? [],
      gastos:               gastos               ?? [],
      totales:              totales              ?? {},
      gastosFijosEmpresa:   gastosFijosEmpresa   ?? [],
      gastosFijosPersonal:  gastosFijosPersonal  ?? [],
    };
    const cerrada = estado === 'cerrada';

    await query(
      `INSERT INTO caja_diaria (fecha, datos, cerrada, actualizado)
       VALUES ($1, $2::jsonb, $3, NOW())
       ON CONFLICT (fecha)
       DO UPDATE SET datos = EXCLUDED.datos, cerrada = EXCLUDED.cerrada, actualizado = NOW()`,
      [fecha, JSON.stringify(datos), cerrada]
    );

    const nTurnos   = Array.isArray(turnos) ? turnos.length : 0;
    const nPresente = Array.isArray(turnos) ? turnos.filter((t: { asistencia?: string }) => t.asistencia === 'presente').length : 0;
    const cobrado   = totales?.ingresos_totales ?? 0;

    return NextResponse.json({
      ok: true,
      mensaje: `Guardado: ${nTurnos} turno${nTurnos !== 1 ? 's' : ''} · ${nPresente} cobrado${nPresente !== 1 ? 's' : ''} · $${cobrado.toLocaleString('es-AR')} · carpeta ${fecha}`,
      fecha,
      cerrada,
    });
  } catch (err) {
    console.error('[/api/caja POST]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
