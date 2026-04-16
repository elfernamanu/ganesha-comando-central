/**
 * /api/gastos-fijos — Gastos fijos sincronizados en PostgreSQL
 * Tabla: gastos_fijos (tipo TEXT PK, datos JSONB, actualizado TIMESTAMPTZ)
 * SIN ensureTable() — la tabla debe existir en la DB (creada por admin).
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// ── GET: devuelve empresa y personal ──────────────────────────────────────────
export async function GET() {
  try {
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

    if (Array.isArray(empresa)) {
      await query(
        `INSERT INTO gastos_fijos (tipo, datos, actualizado)
         VALUES ('empresa', $1::jsonb, NOW())
         ON CONFLICT (tipo) DO UPDATE
           SET datos = EXCLUDED.datos, actualizado = NOW()`,
        [JSON.stringify(empresa)]
      );
    }

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
