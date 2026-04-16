/**
 * /api/gastos-fijos — Gastos fijos sincronizados en PostgreSQL
 *
 * GET  /api/gastos-fijos           → devuelve { empresa: GastoFijo[], personal: GastoFijo[] }
 * POST /api/gastos-fijos           → guarda/actualiza ambas listas
 *
 * Tabla:
 *   gastos_fijos (tipo TEXT PK, datos JSONB, actualizado TIMESTAMPTZ)
 *   tipo = 'empresa' | 'personal'
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// ── Crear tabla si no existe — solo una vez por proceso ───────────────────────
let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS gastos_fijos (
        tipo        TEXT        PRIMARY KEY,
        datos       JSONB       NOT NULL DEFAULT '[]',
        actualizado TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    tableReady = true;
  } catch {
    // Puede fallar por permisos (PostgreSQL 15+) — verificar si la tabla ya existe
    try {
      await query(`SELECT 1 FROM gastos_fijos LIMIT 0`);
      tableReady = true; // tabla existe, podemos continuar
    } catch {
      // Tabla no existe y no tenemos permisos para crearla
      // Intentar con SET SCHEMA y GRANT antes de crear
      try {
        await query(`SET search_path TO public`);
        await query(`
          CREATE TABLE IF NOT EXISTS gastos_fijos (
            tipo        TEXT        PRIMARY KEY,
            datos       JSONB       NOT NULL DEFAULT '[]',
            actualizado TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);
        tableReady = true;
      } catch (err2) {
        throw new Error(`No se puede crear tabla gastos_fijos: ${String(err2)}`);
      }
    }
  }
}

// ── GET: devuelve empresa y personal ──────────────────────────────────────────
export async function GET() {
  try {
    await ensureTable();
    const rows = await query<{ tipo: string; datos: unknown }>(
      'SELECT tipo, datos FROM gastos_fijos WHERE tipo IN ($1, $2)',
      ['empresa', 'personal']
    );

    const empresa  = (rows.find(r => r.tipo === 'empresa')?.datos  ?? []) as unknown[];
    const personal = (rows.find(r => r.tipo === 'personal')?.datos ?? []) as unknown[];

    return NextResponse.json({ ok: true, empresa, personal });
  } catch (err) {
    console.error('[GET /api/gastos-fijos]', err);
    return NextResponse.json({ ok: false, empresa: [], personal: [] }, { status: 500 });
  }
}

// ── POST: guarda empresa y/o personal ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { empresa, personal } = body as { empresa?: unknown[]; personal?: unknown[] };

    await ensureTable();

    // Upsert empresa
    if (Array.isArray(empresa)) {
      await query(
        `INSERT INTO gastos_fijos (tipo, datos, actualizado)
         VALUES ('empresa', $1::jsonb, NOW())
         ON CONFLICT (tipo) DO UPDATE
           SET datos = EXCLUDED.datos, actualizado = NOW()`,
        [JSON.stringify(empresa)]
      );
    }

    // Upsert personal
    if (Array.isArray(personal)) {
      await query(
        `INSERT INTO gastos_fijos (tipo, datos, actualizado)
         VALUES ('personal', $1::jsonb, NOW())
         ON CONFLICT (tipo) DO UPDATE
           SET datos = EXCLUDED.datos, actualizado = NOW()`,
        [JSON.stringify(personal)]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/gastos-fijos]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
