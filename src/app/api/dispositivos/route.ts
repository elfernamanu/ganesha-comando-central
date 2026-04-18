/**
 * /api/dispositivos — Registro de dispositivos que acceden a la app
 *
 * GET  /api/dispositivos?id=UUID → info de un dispositivo específico (alias, registrado)
 * GET  /api/dispositivos         → lista todos los dispositivos (más reciente primero)
 * POST /api/dispositivos         → registra o actualiza un dispositivo
 *   { id, nombre?, alias? }
 *   - alias = nombre personalizado ("PC Dueña", "Celular Dueña", etc.)
 *   - Si alias está presente → el dispositivo queda "registrado"
 *
 * Tabla:
 *   dispositivos (
 *     id          TEXT PRIMARY KEY,
 *     alias       TEXT DEFAULT '',    -- nombre personalizado del dueño
 *     nombre      TEXT DEFAULT '',    -- auto-detectado (Chrome Windows, etc.)
 *     user_agent  TEXT,
 *     ip          TEXT,
 *     primera_vez TIMESTAMPTZ DEFAULT NOW(),
 *     ultima_vez  TIMESTAMPTZ DEFAULT NOW(),
 *     visitas     INTEGER DEFAULT 1
 *   )
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS dispositivos (
      id          TEXT        PRIMARY KEY,
      alias       TEXT        NOT NULL DEFAULT '',
      nombre      TEXT        NOT NULL DEFAULT '',
      user_agent  TEXT        NOT NULL DEFAULT '',
      ip          TEXT        NOT NULL DEFAULT '',
      primera_vez TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ultima_vez  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      visitas     INTEGER     NOT NULL DEFAULT 1
    )
  `);
  // Agregar columna alias si la tabla ya existía sin ella
  await query(`ALTER TABLE dispositivos ADD COLUMN IF NOT EXISTS alias TEXT NOT NULL DEFAULT ''`).catch(() => {});
  tableReady = true;
}

// ── GET: info de dispositivo por id, o lista completa ────────────────────────
export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const id = req.nextUrl.searchParams.get('id');

    if (id) {
      // Consulta de un dispositivo específico
      const rows = await query<{
        id: string; alias: string; nombre: string;
        ip: string; primera_vez: string; ultima_vez: string; visitas: number;
      }>(
        `SELECT id, alias, nombre, ip, primera_vez, ultima_vez, visitas
         FROM dispositivos WHERE id = $1`,
        [id]
      );
      if (!rows[0]) {
        return NextResponse.json({ ok: true, encontrado: false });
      }
      return NextResponse.json({
        ok: true,
        encontrado: true,
        registrado: rows[0].alias !== '',
        dispositivo: rows[0],
      });
    }

    // Lista completa
    const rows = await query<{
      id: string; alias: string; nombre: string;
      ip: string; primera_vez: string; ultima_vez: string; visitas: number;
    }>(
      `SELECT id, alias, nombre, ip, primera_vez, ultima_vez, visitas
       FROM dispositivos ORDER BY ultima_vez DESC`
    );
    return NextResponse.json({ ok: true, dispositivos: rows });
  } catch (err) {
    console.error('[GET /api/dispositivos]', err);
    return NextResponse.json({ ok: false, dispositivos: [] }, { status: 500 });
  }
}

// ── POST: registrar / actualizar dispositivo ──────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { id?: string; nombre?: string; alias?: string };
    const { id, nombre, alias } = body;

    if (!id) return NextResponse.json({ ok: false, error: 'Falta id' }, { status: 400 });

    const ua = req.headers.get('user-agent') ?? '';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              ?? req.headers.get('x-real-ip')
              ?? 'desconocida';

    await ensureTable();

    if (alias !== undefined) {
      // Actualizar alias (nombre personalizado del dueño)
      await query(
        `INSERT INTO dispositivos (id, alias, nombre, user_agent, ip, primera_vez, ultima_vez, visitas)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), 1)
         ON CONFLICT (id) DO UPDATE
           SET alias      = EXCLUDED.alias,
               nombre     = CASE WHEN EXCLUDED.nombre != '' THEN EXCLUDED.nombre ELSE dispositivos.nombre END,
               user_agent = EXCLUDED.user_agent,
               ip         = EXCLUDED.ip,
               ultima_vez = NOW(),
               visitas    = dispositivos.visitas + 1`,
        [id, alias, nombre ?? '', ua, ip]
      );
    } else {
      // Solo actualizar info de conexión (sin tocar el alias)
      await query(
        `INSERT INTO dispositivos (id, alias, nombre, user_agent, ip, primera_vez, ultima_vez, visitas)
         VALUES ($1, '', $2, $3, $4, NOW(), NOW(), 1)
         ON CONFLICT (id) DO UPDATE
           SET nombre     = CASE WHEN EXCLUDED.nombre != '' THEN EXCLUDED.nombre ELSE dispositivos.nombre END,
               user_agent = EXCLUDED.user_agent,
               ip         = EXCLUDED.ip,
               ultima_vez = NOW(),
               visitas    = dispositivos.visitas + 1`,
        [id, nombre ?? '', ua, ip]
      );
    }

    // Devolver estado actual del dispositivo
    const rows = await query<{ alias: string; visitas: number }>(
      `SELECT alias, visitas FROM dispositivos WHERE id = $1`, [id]
    );
    return NextResponse.json({
      ok: true,
      registrado: (rows[0]?.alias ?? '') !== '',
      alias: rows[0]?.alias ?? '',
      visitas: rows[0]?.visitas ?? 1,
    });
  } catch (err) {
    console.error('[POST /api/dispositivos]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
