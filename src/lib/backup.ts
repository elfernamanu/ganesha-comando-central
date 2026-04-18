import { query } from '@/lib/db';

let ready = false;
async function ensureTable() {
  if (ready) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS backups_previos (
        tabla TEXT NOT NULL,
        clave TEXT NOT NULL,
        datos JSONB NOT NULL,
        guardado_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (tabla, clave)
      )
    `);
    ready = true;
  } catch { /* sin permisos CREATE — la tabla debe crearse manualmente */ }
}

/**
 * Guarda la versión ACTUAL como backup antes de sobreescribirla.
 * Llama a esta función justo antes de cualquier INSERT/UPDATE sobre datos reales.
 * Si la tabla backups_previos no existe o falla, NO bloquea la escritura principal.
 */
export async function guardarBackup(tabla: string, clave: string, datos: unknown): Promise<void> {
  try {
    await ensureTable();
    await query(
      `INSERT INTO backups_previos (tabla, clave, datos, guardado_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (tabla, clave) DO UPDATE
         SET datos = EXCLUDED.datos, guardado_at = EXCLUDED.guardado_at`,
      [tabla, clave, JSON.stringify(datos)]
    );
  } catch { /* silencioso — no bloquea la escritura principal */ }
}
