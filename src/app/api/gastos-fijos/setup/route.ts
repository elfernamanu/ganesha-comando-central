/**
 * GET /api/gastos-fijos/setup
 * Crea la tabla gastos_fijos si no existe.
 * Llama este endpoint UNA VEZ para inicializar la base de datos.
 */
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const log: string[] = [];
  try {
    // Intentar con GRANT primero (en caso de PostgreSQL 15+)
    try {
      await query(`GRANT CREATE ON SCHEMA public TO CURRENT_USER`);
      log.push('GRANT CREATE: ok');
    } catch (e) {
      log.push(`GRANT CREATE: omitido (${String(e).split('\n')[0]})`);
    }

    await query(`
      CREATE TABLE IF NOT EXISTS gastos_fijos (
        tipo        TEXT        PRIMARY KEY,
        datos       JSONB       NOT NULL DEFAULT '[]',
        actualizado TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    log.push('CREATE TABLE gastos_fijos: ok');

    // Verificar
    const rows = await query(`SELECT tipo, datos FROM gastos_fijos`);
    log.push(`Registros en tabla: ${rows.length}`);

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    log.push(`ERROR: ${String(err)}`);
    return NextResponse.json({ ok: false, log, error: String(err) }, { status: 500 });
  }
}
