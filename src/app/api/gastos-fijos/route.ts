/**
 * /api/gastos-fijos — Gastos fijos sincronizados en PostgreSQL
 *
 * Usa la tabla config_servicios (que ya existe) con IDs negativos reservados:
 *   id = -1  → gastos empresa  (datos JSONB = GastoFijo[])
 *   id = -2  → gastos personal (datos JSONB = GastoFijo[])
 *
 * Esto evita necesitar CREATE TABLE (problema de permisos en PG 15+).
 * No interfiere con la config de servicios (id=1) porque ORDER BY id DESC LIMIT 1
 * siempre devuelve el id más alto (positivo).
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const ID_EMPRESA  = -1;
const ID_PERSONAL = -2;

// ── GET: devuelve empresa y personal ──────────────────────────────────────────
export async function GET() {
  try {
    const rows = await query<{ id: number; datos: unknown }>(
      'SELECT id, datos FROM config_servicios WHERE id IN ($1, $2)',
      [ID_EMPRESA, ID_PERSONAL]
    );

    const empresa  = (rows.find(r => r.id === ID_EMPRESA)?.datos  ?? []) as unknown[];
    const personal = (rows.find(r => r.id === ID_PERSONAL)?.datos ?? []) as unknown[];

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

    if (Array.isArray(empresa)) {
      await query(
        `INSERT INTO config_servicios (id, datos, actualizado_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE
           SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [ID_EMPRESA, JSON.stringify(empresa)]
      );
    }

    if (Array.isArray(personal)) {
      await query(
        `INSERT INTO config_servicios (id, datos, actualizado_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE
           SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [ID_PERSONAL, JSON.stringify(personal)]
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/gastos-fijos]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
