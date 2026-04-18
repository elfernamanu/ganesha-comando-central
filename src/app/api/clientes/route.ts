/**
 * /api/clientes — tabla dedicada clientes_telefonos
 *
 * Tabla propia, completamente separada de config_servicios.
 * No puede ser afectada por ninguna operación sobre otras tablas.
 *
 * SQL para crear la tabla (ejecutar en el servidor PostgreSQL):
 *   CREATE TABLE IF NOT EXISTS clientes_telefonos (
 *     id INTEGER PRIMARY KEY DEFAULT 1,
 *     datos JSONB NOT NULL DEFAULT '[]',
 *     actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *   INSERT INTO clientes_telefonos (id, datos) VALUES (1, '[]') ON CONFLICT DO NOTHING;
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guardarBackup } from '@/lib/backup';

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clientes_telefonos'
     ) AS exists`
  );
  if (!rows[0]?.exists) {
    throw new Error('TABLA_FALTANTE: crear clientes_telefonos en PostgreSQL (ver comentario en route.ts)');
  }
  tableReady = true;
}

export async function GET() {
  try {
    await ensureTable();
    const rows = await query<{ datos: unknown }>(
      'SELECT datos FROM clientes_telefonos WHERE id = 1'
    );
    return NextResponse.json({ ok: true, datos: rows[0]?.datos ?? [] });
  } catch (err) {
    console.error('[GET /api/clientes]', err);
    // Fallback a config_servicios mientras se migra
    try {
      const fallback = await query<{ datos: unknown }>(
        'SELECT datos FROM config_servicios WHERE id = -4'
      );
      return NextResponse.json({ ok: true, datos: fallback[0]?.datos ?? [] });
    } catch {
      return NextResponse.json({ ok: false, datos: [] }, { status: 500 });
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { datos, forzar } = body as { datos?: unknown[]; forzar?: boolean };
    if (!Array.isArray(datos)) {
      return NextResponse.json({ ok: false, error: 'datos debe ser un array' }, { status: 400 });
    }

    const json = JSON.stringify(datos);

    // Protección: nunca vaciar la base de contactos accidentalmente.
    // Si el dispositivo envía [] pero el servidor ya tiene contactos → rechazar.
    // Para vaciar intencionalmente usar forzar: true.
    if (datos.length === 0 && !forzar) {
      try {
        await ensureTable();
        const existing = await query<{ cant: string }>(
          `SELECT jsonb_array_length(datos)::text AS cant FROM clientes_telefonos WHERE id = 1`
        );
        const cantExistente = parseInt(existing[0]?.cant ?? '0', 10);
        if (cantExistente > 0) {
          return NextResponse.json({
            ok: false,
            protegido: true,
            error: `Protección activa: hay ${cantExistente} contacto${cantExistente !== 1 ? 's' : ''} en el servidor. No se puede guardar vacío.`,
          }, { status: 409 });
        }
      } catch { /* tabla no existe todavía — no hay datos que proteger */ }
    }

    // Guardar backup ANTES de sobreescribir (permite recuperar si algo salió mal)
    const prev = await query<{ datos: unknown }>(
      'SELECT datos FROM clientes_telefonos WHERE id = 1'
    ).catch(() => []);
    if ((prev as { datos: unknown }[])[0]?.datos) {
      await guardarBackup('clientes', '1', (prev as { datos: unknown }[])[0].datos);
    }

    // Intentar guardar en clientes_telefonos; si la tabla no existe, usar config_servicios
    let savedMain = false;
    try {
      await ensureTable();
      await query(
        `INSERT INTO clientes_telefonos (id, datos, actualizado_at) VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [json]
      );
      savedMain = true;
    } catch { /* tabla no existe todavía */ }

    // config_servicios: backup secundario
    await query(
      `INSERT INTO config_servicios (id, datos, actualizado_at) VALUES (-4, $1::jsonb, NOW())
       ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
      [json]
    ).catch(err => { if (!savedMain) throw err; }); // solo propagar si tampoco se guardó en principal

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/clientes]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
