/**
 * /api/presencia — Detección de dispositivos conectados
 *
 * Requiere tabla en PostgreSQL (ejecutar manualmente con superusuario):
 *   CREATE TABLE IF NOT EXISTS presencia (
 *     device_id   TEXT PRIMARY KEY,
 *     device_name TEXT NOT NULL DEFAULT 'Dispositivo',
 *     pagina      TEXT NOT NULL DEFAULT '/',
 *     last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *   GRANT SELECT, INSERT, UPDATE, DELETE ON presencia TO ganesha_web;
 *
 * GET  /api/presencia          → lista dispositivos vistos en los últimos 90s
 * POST /api/presencia          → heartbeat del dispositivo actual
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'presencia'
     ) as exists`
  );
  if (!rows[0]?.exists) {
    throw new Error('TABLA_FALTANTE: ejecutá el SQL de migración en el servidor PostgreSQL');
  }
  tableReady = true;
}

export async function GET() {
  try {
    await ensureTable();
    // Limpiar entradas viejas (más de 10 minutos) y devolver las activas (últimos 90s)
    await query(`DELETE FROM presencia WHERE last_seen < NOW() - INTERVAL '10 minutes'`);
    const rows = await query<{ device_id: string; device_name: string; pagina: string; last_seen: string }>(
      `SELECT device_id, device_name, pagina, last_seen
       FROM presencia
       WHERE last_seen > NOW() - INTERVAL '90 seconds'
       ORDER BY last_seen DESC`
    );
    return NextResponse.json({ ok: true, dispositivos: rows }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, dispositivos: [], error: String(err) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { device_id, device_name, pagina } = await req.json();
    if (!device_id) return NextResponse.json({ ok: false, error: 'Falta device_id' }, { status: 400 });

    await ensureTable();
    await query(
      `INSERT INTO presencia (device_id, device_name, pagina, last_seen)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (device_id) DO UPDATE
         SET device_name = EXCLUDED.device_name,
             pagina      = EXCLUDED.pagina,
             last_seen   = NOW()`,
      [device_id, device_name || 'Dispositivo', pagina || '/']
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
