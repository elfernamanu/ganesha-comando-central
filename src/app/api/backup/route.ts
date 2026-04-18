/**
 * /api/backup — descarga completa y recuperación de datos
 *
 * GET  /api/backup                          → descarga JSON completo de toda la BD
 * GET  /api/backup?info=1                   → última actualización por sección
 * GET  /api/backup?tabla=turnos&clave=2026-04-18  → lista versiones de backup disponibles
 * GET  /api/backup?tabla=turnos&clave=2026-04-18&id=42  → datos de una versión específica
 *
 * POST /api/backup { accion:'restaurar', tabla, clave, id? }
 *   → restaura la versión más reciente (o la indicada por id) a la tabla principal
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { listarBackups } from '@/lib/backup';

export async function GET(req: NextRequest) {
  const info    = req.nextUrl.searchParams.get('info');
  const tabla   = req.nextUrl.searchParams.get('tabla');
  const clave   = req.nextUrl.searchParams.get('clave');
  const idParam = req.nextUrl.searchParams.get('id');

  // ?info=1 → última actualización por sección
  if (info) {
    try {
      const [turnos, clientes, caja, config, combos] = await Promise.allSettled([
        query<{ ultima: string }>('SELECT MAX(actualizado_at)::text AS ultima FROM turnos'),
        query<{ ultima: string }>('SELECT MAX(actualizado_at)::text AS ultima FROM clientes_telefonos'),
        query<{ ultima: string }>('SELECT MAX(actualizado)::text AS ultima FROM caja_diaria'),
        query<{ ultima: string }>('SELECT actualizado_at::text AS ultima FROM config_servicios WHERE id = 1'),
        query<{ ultima: string }>('SELECT actualizado_at::text AS ultima FROM config_servicios WHERE id = -3'),
      ]);
      const get = (r: PromiseSettledResult<{ ultima: string }[]>) =>
        r.status === 'fulfilled' ? (r.value[0]?.ultima ?? null) : null;
      return NextResponse.json({
        ok: true,
        secciones: {
          turnos:   get(turnos),
          clientes: get(clientes),
          caja:     get(caja),
          config:   get(config),
          combos:   get(combos),
        },
      });
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
  }

  // ?tabla=X&clave=Y → lista versiones disponibles (+ datos si se pide &id=N)
  if (tabla && clave) {
    try {
      if (idParam) {
        // Versión específica
        const rows = await query<{ datos: unknown; guardado_at: string }>(
          `SELECT datos, guardado_at FROM backups_previos WHERE id = $1 AND tabla = $2 AND clave = $3`,
          [parseInt(idParam, 10), tabla, clave]
        );
        if (!rows[0]) return NextResponse.json({ ok: false, error: 'Versión no encontrada' }, { status: 404 });
        return NextResponse.json({ ok: true, datos: rows[0].datos, guardado_at: rows[0].guardado_at });
      }

      const versiones = await listarBackups(tabla, clave);
      if (versiones.length === 0) return NextResponse.json({ ok: false, error: 'Sin backups para esa clave' }, { status: 404 });

      // Datos de la versión más reciente
      const rows = await query<{ datos: unknown; guardado_at: string }>(
        `SELECT datos, guardado_at FROM backups_previos WHERE id = $1`,
        [versiones[0].id]
      );
      return NextResponse.json({
        ok: true,
        datos: rows[0]?.datos,
        guardado_at: rows[0]?.guardado_at,
        versiones,
      });
    } catch (err) {
      return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
    }
  }

  // Sin parámetros → backup completo descargable (todo en un JSON)
  try {
    const [config, turnos, cajaRows, clientes, combos, gastosFijosEmp, gastosFijosPer] = await Promise.all([
      query('SELECT * FROM config_servicios WHERE id = 1').catch(() => []),
      query('SELECT fecha::text, datos, actualizado_at FROM turnos ORDER BY fecha').catch(() => []),
      query('SELECT fecha::text, datos, cerrada, actualizado FROM caja_diaria ORDER BY fecha').catch(() => []),
      query('SELECT datos, actualizado_at FROM clientes_telefonos WHERE id = 1').catch(() => []),
      query('SELECT datos, actualizado_at FROM config_servicios WHERE id = -3').catch(() => []),
      query('SELECT datos, actualizado_at FROM config_servicios WHERE id = -1').catch(() => []),
      query('SELECT datos, actualizado_at FROM config_servicios WHERE id = -2').catch(() => []),
    ]);

    const backup = {
      generado_at:        new Date().toISOString(),
      version:            'ganesha_backup_v3',
      config_servicios:   config,
      turnos,
      caja_diaria:        cajaRows,
      clientes:           clientes,
      combos:             combos,
      gastos_fijos_empresa:  gastosFijosEmp,
      gastos_fijos_personal: gastosFijosPer,
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

// POST /api/backup { accion:'restaurar', tabla, clave, id? }
export async function POST(req: NextRequest) {
  try {
    const { accion, tabla, clave, id } = await req.json() as {
      accion?: string; tabla?: string; clave?: string; id?: number;
    };
    if (accion !== 'restaurar' || !tabla || !clave) {
      return NextResponse.json({ ok: false, error: 'Falta accion:restaurar, tabla o clave' }, { status: 400 });
    }

    // Buscar versión específica o la más reciente
    const rows = await query<{ datos: unknown; guardado_at: string }>(
      id
        ? `SELECT datos, guardado_at FROM backups_previos WHERE id = $1 AND tabla = $2 AND clave = $3`
        : `SELECT datos, guardado_at FROM backups_previos WHERE tabla = $1 AND clave = $2 ORDER BY guardado_at DESC LIMIT 1`,
      id ? [id, tabla, clave] : [tabla, clave]
    );
    if (!rows[0]) {
      return NextResponse.json({ ok: false, error: 'No hay backup para restaurar' }, { status: 404 });
    }

    const { datos, guardado_at } = rows[0];

    if (tabla === 'turnos') {
      await query(
        `INSERT INTO turnos (fecha, datos, actualizado_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (fecha) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [clave, JSON.stringify(datos)]
      );
    } else if (tabla === 'clientes') {
      await query(
        `INSERT INTO clientes_telefonos (id, datos, actualizado_at) VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [JSON.stringify(datos)]
      );
    } else if (tabla === 'caja') {
      await query(
        `INSERT INTO caja_diaria (fecha, datos, cerrada, actualizado) VALUES ($1, $2::jsonb, false, NOW())
         ON CONFLICT (fecha) DO UPDATE SET datos = EXCLUDED.datos, actualizado = NOW()`,
        [clave, JSON.stringify(datos)]
      );
    } else if (tabla === 'config') {
      await query(
        `INSERT INTO config_servicios (id, datos, actualizado_at) VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [JSON.stringify(datos)]
      );
    } else if (tabla === 'combos') {
      await query(
        `INSERT INTO config_servicios (id, datos, actualizado_at) VALUES (-3, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [JSON.stringify(datos)]
      );
    } else if (tabla === 'gastos_empresa') {
      await query(
        `INSERT INTO config_servicios (id, datos, actualizado_at) VALUES (-1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [JSON.stringify(datos)]
      );
    } else if (tabla === 'gastos_personal') {
      await query(
        `INSERT INTO config_servicios (id, datos, actualizado_at) VALUES (-2, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [JSON.stringify(datos)]
      );
    } else {
      return NextResponse.json({ ok: false, error: `Tabla '${tabla}' no soportada` }, { status: 400 });
    }

    const fechaBackup = new Date(guardado_at).toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
    return NextResponse.json({ ok: true, mensaje: `Backup del ${fechaBackup} restaurado correctamente` });
  } catch (err) {
    console.error('[POST /api/backup]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
