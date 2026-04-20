import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface StatRow { nombre: string; asistencia: string; tratamiento: string; }

export async function GET() {
  try {
    const rows = await query<StatRow>(
      `SELECT
         elem->>'clienteNombre' AS nombre,
         elem->>'asistencia'    AS asistencia,
         elem->>'tratamiento'   AS tratamiento
       FROM turnos, jsonb_array_elements(datos) AS elem
       WHERE jsonb_typeof(datos) = 'array'
         AND trim(elem->>'clienteNombre') != ''`
    );

    const acum = new Map<string, {
      total: number; pres: number; aus: number;
      trats: Map<string, number>; esHombre: boolean;
    }>();

    for (const row of rows) {
      const nombre = row.nombre?.trim();
      if (!nombre) continue;
      if (!acum.has(nombre)) acum.set(nombre, { total: 0, pres: 0, aus: 0, trats: new Map(), esHombre: false });
      const s = acum.get(nombre)!;
      s.total++;
      if (row.asistencia === 'presente') s.pres++;
      if (row.asistencia === 'no_vino')  s.aus++;
      if (row.tratamiento && row.tratamiento !== 'Otro') {
        s.trats.set(row.tratamiento, (s.trats.get(row.tratamiento) ?? 0) + 1);
        const tl = row.tratamiento.toLowerCase();
        if (tl.includes('hombre') || row.tratamiento.includes('💪')) s.esHombre = true;
      }
    }

    const stats: Record<string, {
      totalTurnos: number; presentes: number; ausentes: number;
      tratamientoFrecuente: string; generoDetectado: 'm' | 'f';
    }> = {};

    for (const [nombre, s] of acum) {
      let trat = ''; let max = 0;
      for (const [t, c] of s.trats) { if (c > max) { max = c; trat = t; } }
      stats[nombre] = {
        totalTurnos: s.total, presentes: s.pres, ausentes: s.aus,
        tratamientoFrecuente: trat,
        generoDetectado: s.esHombre ? 'm' : 'f',
      };
    }

    return NextResponse.json({ ok: true, stats }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ ok: false, stats: {} });
  }
}
