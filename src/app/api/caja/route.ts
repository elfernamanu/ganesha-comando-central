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
    // Totales guardados, o valor neutro por si el registro es antiguo
    const totalesDefault = {
      ingresos_totales: 0, gastos_totales: 0, ganancia_neta: 0,
      turnos_total: 0, turnos_presentes: 0, turnos_ausentes: 0,
      efectivo: 0, transferencia: 0, otro: 0,
    };

    return NextResponse.json({
      ok: true,
      encontrado: true,
      cerrada: rows[0].cerrada,
      turnos:               datos.turnos              ?? [],
      gastos:               datos.gastos              ?? [],
      totales:              datos.totales             ?? totalesDefault,
      gastosFijosEmpresa:   datos.gastosFijosEmpresa  ?? [],
      gastosFijosPersonal:  datos.gastosFijosPersonal ?? [],
    });
  } catch (err) {
    console.error('[/api/caja GET]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// ── POST: guardar/cerrar caja ──────────────────────────────────────────────
//
// Dos modos:
//   estado = 'cerrada'  → cierre completo: guarda todo (snapshot), marca cerrada = TRUE
//   estado = 'abierta'  → auto-guardado parcial: solo actualiza gastos en datos JSONB,
//                          NUNCA reabre una caja ya cerrada
//
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fecha, turnos, gastos, totales, estado, gastosFijosEmpresa, gastosFijosPersonal } = body;

    if (!fecha) return NextResponse.json({ ok: false, error: 'Falta fecha' }, { status: 400 });

    await ensureTable();

    if (estado === 'cerrada') {
      // ── Cierre completo: snapshot de todo ─────────────────────────────────
      const datos = {
        turnos:               turnos               ?? [],
        gastos:               gastos               ?? [],
        totales:              totales              ?? {},
        gastosFijosEmpresa:   gastosFijosEmpresa   ?? [],
        gastosFijosPersonal:  gastosFijosPersonal  ?? [],
      };

      await query(
        `INSERT INTO caja_diaria (fecha, datos, cerrada, actualizado)
         VALUES ($1, $2::jsonb, true, NOW())
         ON CONFLICT (fecha) DO UPDATE
           SET datos      = EXCLUDED.datos,
               cerrada    = true,
               actualizado = NOW()`,
        [fecha, JSON.stringify(datos)]
      );

      const nTurnos   = Array.isArray(turnos) ? turnos.length : 0;
      const nPresente = Array.isArray(turnos)
        ? turnos.filter((t: { asistencia?: string }) => t.asistencia === 'presente').length : 0;
      const cobrado   = totales?.ingresos_totales ?? 0;

      return NextResponse.json({
        ok: true,
        mensaje: `Guardado: ${nTurnos} turno${nTurnos !== 1 ? 's' : ''} · ${nPresente} cobrado${nPresente !== 1 ? 's' : ''} · $${cobrado.toLocaleString('es-AR')} · carpeta ${fecha}`,
        fecha,
        cerrada: true,
      });

    } else {
      // ── Auto-guardado parcial: solo gastos del día ─────────────────────────
      // Usa || (merge JSONB) para actualizar solo el campo 'gastos' en datos.
      // Nunca cambia cerrada — si estaba true, queda true.
      const parche = JSON.stringify({ gastos: gastos ?? [] });

      await query(
        `INSERT INTO caja_diaria (fecha, datos, cerrada, actualizado)
         VALUES ($1, $2::jsonb, false, NOW())
         ON CONFLICT (fecha) DO UPDATE
           SET datos       = caja_diaria.datos || $2::jsonb,
               actualizado = NOW()`,
        [fecha, parche]
      );

      return NextResponse.json({ ok: true, parcial: true, fecha });
    }

  } catch (err) {
    console.error('[/api/caja POST]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
