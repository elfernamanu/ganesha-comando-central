/**
 * /api/dispositivos — Registro de dispositivos que acceden a la app
 *
 * GET  /api/dispositivos        → lista todos los dispositivos (más reciente primero)
 * POST /api/dispositivos        → registra o actualiza un dispositivo
 *
 * Tabla:
 *   dispositivos (
 *     id          TEXT PRIMARY KEY,   -- UUID guardado en localStorage del cliente
 *     nombre      TEXT,               -- "iPhone — Safari", "PC Windows — Chrome", etc.
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
      nombre      TEXT        NOT NULL DEFAULT '',
      user_agent  TEXT        NOT NULL DEFAULT '',
      ip          TEXT        NOT NULL DEFAULT '',
      primera_vez TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ultima_vez  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      visitas     INTEGER     NOT NULL DEFAULT 1
    )
  `);
  tableReady = true;
}

// ── GET: lista de dispositivos ────────────────────────────────────────────────
export async function GET() {
  try {
    await ensureTable();
    const rows = await query<{
      id: string;
      nombre: string;
      ip: string;
      primera_vez: string;
      ultima_vez: string;
      visitas: number;
    }>(
      `SELECT id, nombre, ip, primera_vez, ultima_vez, visitas
       FROM dispositivos
       ORDER BY ultima_vez DESC`
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
    const body = await req.json() as { id?: string; nombre?: string };
    const { id, nombre } = body;

    if (!id) return NextResponse.json({ ok: false, error: 'Falta id' }, { status: 400 });

    const ua = req.headers.get('user-agent') ?? '';
    // IP real: Vercel forwarding header, o fallback
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
              ?? req.headers.get('x-real-ip')
              ?? 'desconocida';

    await ensureTable();

    await query(
      `INSERT INTO dispositivos (id, nombre, user_agent, ip, primera_vez, ultima_vez, visitas)
       VALUES ($1, $2, $3, $4, NOW(), NOW(), 1)
       ON CONFLICT (id) DO UPDATE
         SET nombre     = EXCLUDED.nombre,
             user_agent = EXCLUDED.user_agent,
             ip         = EXCLUDED.ip,
             ultima_vez = NOW(),
             visitas    = dispositivos.visitas + 1`,
      [id, nombre ?? '', ua]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/dispositivos]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
