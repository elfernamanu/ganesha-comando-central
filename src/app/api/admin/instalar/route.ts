/**
 * GET  /api/admin/instalar → estado: ¿hay base de datos?, ¿qué tablas tiene?, ¿cuántos datos?
 * POST /api/admin/instalar → crea las tablas que falten (no toca las que existen)
 */
import { NextResponse } from 'next/server';
import { query, problemaDeConfiguracion, explicarErrorDeConexion } from '@/lib/db';
import { instalarEsquema, tablasPresentes, TABLAS } from '@/lib/schema';

async function contar() {
  const [dias, contactos, config] = await Promise.all([
    query<{ dias: string; turnos: string }>(
      `SELECT COUNT(*)::text AS dias, COALESCE(SUM(jsonb_array_length(datos)), 0)::text AS turnos
       FROM turnos WHERE jsonb_typeof(datos) = 'array'`
    ).catch(() => [{ dias: '0', turnos: '0' }]),
    query<{ cant: string }>(
      `SELECT COALESCE(jsonb_array_length(datos), 0)::text AS cant FROM clientes_telefonos WHERE id = 1 AND jsonb_typeof(datos) = 'array'`
    ).catch(() => []),
    query<{ id: number }>(`SELECT id FROM config_servicios`).catch(() => []),
  ]);
  const ids = new Set(config.map(r => Number(r.id)));
  return {
    diasConTurnos: parseInt(dias[0]?.dias ?? '0', 10),
    turnos: parseInt(dias[0]?.turnos ?? '0', 10),
    contactos: parseInt(contactos[0]?.cant ?? '0', 10),
    precios: ids.has(1),
    gastosFijos: ids.has(-1) || ids.has(-2),
    combos: ids.has(-3),
  };
}

export async function GET() {
  const problema = problemaDeConfiguracion();
  if (problema) return NextResponse.json({ ok: true, conectado: false, motivo: problema });
  try {
    const presentes = await tablasPresentes();
    const faltan = TABLAS.filter(t => !presentes.includes(t));
    const datos = faltan.length === 0 ? await contar() : null;
    return NextResponse.json({ ok: true, conectado: true, faltan, datos }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ ok: true, conectado: false, motivo: explicarErrorDeConexion(err) });
  }
}

export async function POST() {
  const problema = problemaDeConfiguracion();
  if (problema) return NextResponse.json({ ok: false, error: problema }, { status: 503 });
  try {
    await instalarEsquema();
    return NextResponse.json({ ok: true, tablas: await tablasPresentes() });
  } catch (err) {
    return NextResponse.json({ ok: false, error: explicarErrorDeConexion(err) }, { status: 500 });
  }
}
