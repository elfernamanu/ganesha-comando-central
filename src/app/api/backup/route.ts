import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/backup
 * Sin parámetros → descarga JSON completo de toda la base (para guardar offline).
 * ?info=1       → lista secciones con su último actualizado_at (para mostrar en UI).
 * ?restaurar=turnos&fecha=2026-04-18 → devuelve backup previo de esa fecha (si existe).
 *
 * POST /api/backup { accion:'restaurar', tabla:'turnos'|'clientes', clave?:'2026-04-18' }
 * → restaura el último snapshot previo guardado en la tabla backups_previos.
 */

// Tabla backups_previos: guarda la versión ANTERIOR antes de cada escritura.
// SQL (ejecutar manualmente si es la primera vez):
//   CREATE TABLE IF NOT EXISTS backups_previos (
//     tabla TEXT NOT NULL,
//     clave TEXT NOT NULL,
//     datos JSONB NOT NULL,
//     guardado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
//     PRIMARY KEY (tabla, clave)
//   );
//   GRANT SELECT, INSERT, UPDATE ON backups_previos TO ganesha_web;

let backupTableReady = false;
export async function ensureBackupTable() {
  if (backupTableReady) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS backups_previos (
        tabla TEXT NOT NULL,
        clave TEXT NOT NULL,
        datos JSONB NOT NULL,
        guardado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (tabla, clave)
      )
    `);
    backupTableReady = true;
  } catch { /* sin permisos CREATE — la tabla debe crearse manualmente */ }
}

export async function GET(req: NextRequest) {
  const info = req.nextUrl.searchParams.get('info');
  const restaurarTabla = req.nextUrl.searchParams.get('restaurar');
  const clave = req.nextUrl.searchParams.get('clave') ?? '1';

  // ?info=1 → estado de últimas actualizaciones por sección
  if (info) {
    try {
      const [turnos, clientes, caja, config] = await Promise.all([
        query<{ ultima: string }>('SELECT MAX(actualizado_at)::text AS ultima FROM turnos').catch(() => []),
        query<{ ultima: string }>('SELECT MAX(actualizado_at)::text AS ultima FROM clientes_telefonos').catch(() => []),
        query<{ ultima: string }>('SELECT MAX(actualizado)::text AS ultima FROM caja_diaria').catch(() => []),
        query<{ ultima: string }>('SELECT MAX(actualizado_at)::text AS ultima FROM config_servicios WHERE id = 1').catch(() => []),
      ]);
      return NextResponse.json({
        ok: true,
        secciones: {
          turnos:    (turnos as { ultima: string }[])[0]?.ultima ?? null,
          clientes:  (clientes as { ultima: string }[])[0]?.ultima ?? null,
          caja:      (caja as { ultima: string }[])[0]?.ultima ?? null,
          config:    (config as { ultima: string }[])[0]?.ultima ?? null,
        },
      });
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
  }

  // ?restaurar=turnos&clave=2026-04-18 → datos del backup previo
  if (restaurarTabla) {
    try {
      await ensureBackupTable();
      const rows = await query<{ datos: unknown; guardado_at: string }>(
        `SELECT datos, guardado_at FROM backups_previos WHERE tabla = $1 AND clave = $2`,
        [restaurarTabla, clave]
      );
      if (!rows[0]) return NextResponse.json({ ok: false, error: 'Sin backup previo para esa clave' }, { status: 404 });
      return NextResponse.json({ ok: true, datos: rows[0].datos, guardado_at: rows[0].guardado_at });
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
  }

  // Sin parámetros → backup completo descargable
  try {
    const [config, turnos, cajaRows, clientes, combos] = await Promise.all([
      query('SELECT * FROM config_servicios ORDER BY id'),
      query('SELECT fecha::text, datos, actualizado_at FROM turnos ORDER BY fecha'),
      query('SELECT fecha::text, datos, cerrada, actualizado FROM caja_diaria ORDER BY fecha').catch(() => []),
      query('SELECT datos, actualizado_at FROM clientes_telefonos WHERE id = 1').catch(() => []),
      query('SELECT * FROM combos ORDER BY id').catch(() => []),
    ]);

    const backup = {
      generado_at:      new Date().toISOString(),
      version:          'ganesha_backup_v2',
      config_servicios: config,
      turnos,
      caja_diaria:      cajaRows,
      clientes:         clientes,
      combos,
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type':        'application/json',
        'Content-Disposition': `attachment; filename="ganesha-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/backup]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// POST /api/backup { accion:'restaurar', tabla:'turnos'|'clientes', clave?:'2026-04-18' }
export async function POST(req: NextRequest) {
  try {
    const { accion, tabla, clave } = await req.json() as { accion?: string; tabla?: string; clave?: string };
    if (accion !== 'restaurar' || !tabla) {
      return NextResponse.json({ ok: false, error: 'Falta accion:restaurar o tabla' }, { status: 400 });
    }

    await ensureBackupTable();
    const claveEfectiva = clave ?? '1';
    const rows = await query<{ datos: unknown; guardado_at: string }>(
      `SELECT datos, guardado_at FROM backups_previos WHERE tabla = $1 AND clave = $2`,
      [tabla, claveEfectiva]
    );
    if (!rows[0]) {
      return NextResponse.json({ ok: false, error: 'No hay backup previo para restaurar' }, { status: 404 });
    }

    const { datos, guardado_at } = rows[0];

    if (tabla === 'turnos') {
      if (!clave) return NextResponse.json({ ok: false, error: 'Falta clave (fecha) para restaurar turnos' }, { status: 400 });
      await query(
        `INSERT INTO turnos (fecha, datos, actualizado_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (fecha) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [clave, JSON.stringify(datos)]
      );
    } else if (tabla === 'clientes') {
      await query(
        `INSERT INTO clientes_telefonos (id, datos, actualizado_at)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [JSON.stringify(datos)]
      );
    } else {
      return NextResponse.json({ ok: false, error: `Tabla '${tabla}' no soportada para restaurar` }, { status: 400 });
    }

    const fecha_backup = new Date(guardado_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });
    return NextResponse.json({ ok: true, mensaje: `Backup del ${fecha_backup} restaurado correctamente` });
  } catch (err) {
    console.error('[POST /api/backup]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
