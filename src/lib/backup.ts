/**
 * lib/backup.ts — sistema de backup automático para toda la app
 *
 * Guarda las últimas 5 versiones de cada dato antes de sobreescribir.
 * Llamar a guardarBackup() desde cualquier endpoint ANTES de hacer un UPDATE/INSERT.
 *
 * Tabla requerida en PostgreSQL (se crea automáticamente si hay permisos):
 *   CREATE TABLE IF NOT EXISTS backups_previos (
 *     id        BIGSERIAL PRIMARY KEY,
 *     tabla     TEXT NOT NULL,
 *     clave     TEXT NOT NULL,
 *     datos     JSONB NOT NULL,
 *     guardado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_backups_tabla_clave
 *     ON backups_previos(tabla, clave, guardado_at DESC);
 *   GRANT SELECT, INSERT, DELETE ON backups_previos TO ganesha_web;
 *   GRANT USAGE, SELECT ON SEQUENCE backups_previos_id_seq TO ganesha_web;
 */
import { query } from '@/lib/db';

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS backups_previos (
        id          BIGSERIAL PRIMARY KEY,
        tabla       TEXT NOT NULL,
        clave       TEXT NOT NULL,
        datos       JSONB NOT NULL,
        guardado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_backups_tabla_clave
        ON backups_previos(tabla, clave, guardado_at DESC)
    `);
    tableReady = true;
  } catch { /* sin permisos CREATE — la tabla debe crearse manualmente */ }
}

const VERSIONES_A_GUARDAR = 5;

/**
 * Guarda la versión actual como backup ANTES de sobreescribir.
 * Mantiene las últimas VERSIONES_A_GUARDAR versiones por (tabla, clave).
 * Silencioso si falla — nunca bloquea la escritura principal.
 *
 * @param tabla  Nombre lógico: 'turnos', 'clientes', 'caja', 'config', 'gastos_empresa', 'gastos_personal', 'combos'
 * @param clave  Identificador único dentro de la tabla (fecha para turnos/caja, '1' para el resto)
 * @param datos  El dato ACTUAL (antes del nuevo write)
 */
export async function guardarBackup(tabla: string, clave: string, datos: unknown): Promise<void> {
  try {
    await ensureTable();

    await query(
      `INSERT INTO backups_previos (tabla, clave, datos, guardado_at)
       VALUES ($1, $2, $3::jsonb, NOW())`,
      [tabla, clave, JSON.stringify(datos)]
    );

    // Mantener solo las últimas N versiones para no crecer indefinidamente
    await query(
      `DELETE FROM backups_previos
       WHERE tabla = $1 AND clave = $2
         AND id NOT IN (
           SELECT id FROM backups_previos
           WHERE tabla = $1 AND clave = $2
           ORDER BY guardado_at DESC
           LIMIT $3
         )`,
      [tabla, clave, VERSIONES_A_GUARDAR]
    );
  } catch { /* silencioso — no bloquea la escritura principal */ }
}

/**
 * Recupera el backup más reciente para una (tabla, clave).
 * Retorna null si no hay backup.
 */
export async function recuperarUltimoBackup(
  tabla: string,
  clave: string
): Promise<{ id: number; datos: unknown; guardado_at: string } | null> {
  try {
    await ensureTable();
    const rows = await query<{ id: number; datos: unknown; guardado_at: string }>(
      `SELECT id, datos, guardado_at
       FROM backups_previos
       WHERE tabla = $1 AND clave = $2
       ORDER BY guardado_at DESC
       LIMIT 1`,
      [tabla, clave]
    );
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Lista todas las versiones de backup para una (tabla, clave), más reciente primero.
 */
export async function listarBackups(
  tabla: string,
  clave: string
): Promise<{ id: number; guardado_at: string }[]> {
  try {
    await ensureTable();
    return await query<{ id: number; guardado_at: string }>(
      `SELECT id, guardado_at
       FROM backups_previos
       WHERE tabla = $1 AND clave = $2
       ORDER BY guardado_at DESC`,
      [tabla, clave]
    );
  } catch {
    return [];
  }
}
