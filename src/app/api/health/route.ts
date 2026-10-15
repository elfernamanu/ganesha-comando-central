import { NextResponse } from 'next/server';
import { query, problemaDeConfiguracion, explicarErrorDeConexion } from '@/lib/db';

/**
 * GET /api/health
 * Diagnóstico del sistema — útil para detectar problemas rápido.
 * No requiere token (es público, no expone datos sensibles).
 */
export async function GET() {
  const resultado: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version ?? '—',
    entorno:   process.env.NODE_ENV,
  };

  // ── Test PostgreSQL ──────────────────────────────────────────────────────
  try {
    const rows = await query<{ now: string }>('SELECT NOW() as now');
    resultado.postgres = {
      estado:      'conectado ✅',
      hora_server: rows[0]?.now,
    };
  } catch (err) {
    resultado.postgres = {
      estado: 'error ❌',
      detalle: problemaDeConfiguracion() ?? explicarErrorDeConexion(err),
    };
  }

  // ── Conteo de registros ───────────────────────────────────────────────────
  try {
    const [cfg, trn, caja] = await Promise.all([
      query<{ c: string }>('SELECT COUNT(*) as c FROM config_servicios'),
      query<{ c: string }>('SELECT COUNT(*) as c FROM turnos'),
      query<{ c: string }>('SELECT COUNT(*) as c FROM caja_diaria'),
    ]);
    resultado.tablas = {
      config_servicios: cfg[0]?.c ?? 0,
      turnos:           trn[0]?.c ?? 0,
      caja_diaria:      caja[0]?.c ?? 0,
    };
  } catch {
    resultado.tablas = 'no disponible';
  }

  // ── Variables de entorno (sin exponer valores) ────────────────────────────
  resultado.env = {
    DATABASE_URL: process.env.DATABASE_URL ? '✅ configurada (base nueva, en uso)' : '— no configurada',
    POSTGRES_URL: process.env.POSTGRES_URL ? (process.env.DATABASE_URL ? '— base vieja, no se usa' : '✅ configurada') : '— no configurada',
    API_SECRET:   process.env.API_SECRET   ? '✅ configurada' : '❌ falta',
    PANEL_PIN:    process.env.PANEL_PIN    ? '✅ configurada' : '— desactivada',
  };

  return NextResponse.json(resultado, { status: 200 });
}
