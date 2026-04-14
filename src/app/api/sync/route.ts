/**
 * /api/sync — Sincronización de turnos entre dispositivos
 * Sin autenticación de cliente (uso interno entre el celular y la PC)
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/sync?fecha=2026-04-14
export async function GET(req: NextRequest) {
  const fecha = req.nextUrl.searchParams.get('fecha');
  if (!fecha) return NextResponse.json({ ok: false, datos: [] });

  try {
    const rows = await query<{ datos: unknown }>(
      'SELECT datos FROM turnos WHERE fecha = $1',
      [fecha]
    );
    return NextResponse.json({ ok: true, datos: rows[0]?.datos ?? [] });
  } catch {
    return NextResponse.json({ ok: false, datos: [] });
  }
}

// POST /api/sync  →  { fecha, datos: Turno[] }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fecha, datos } = body;
    if (!fecha || !Array.isArray(datos)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await query(
      `INSERT INTO turnos (fecha, datos, actualizado_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (fecha) DO UPDATE
         SET datos         = EXCLUDED.datos,
             actualizado_at = NOW()`,
      [fecha, JSON.stringify(datos)]
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
