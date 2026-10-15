import { query } from '@/lib/db';

/**
 * Tablas que usa la app. Todas con IF NOT EXISTS: correr esto sobre una base
 * que ya tiene datos no borra ni cambia nada.
 */
const ESQUEMA = `
CREATE TABLE IF NOT EXISTS turnos (
  fecha          DATE        PRIMARY KEY,
  datos          JSONB       NOT NULL DEFAULT '[]',
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS caja_diaria (
  fecha       DATE        PRIMARY KEY,
  datos       JSONB       NOT NULL DEFAULT '{}',
  cerrada     BOOLEAN     NOT NULL DEFAULT false,
  actualizado TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS config_servicios (
  id             INTEGER     PRIMARY KEY,
  datos          JSONB       NOT NULL DEFAULT '[]',
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS clientes_telefonos (
  id             INTEGER     PRIMARY KEY DEFAULT 1,
  datos          JSONB       NOT NULL DEFAULT '[]',
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO clientes_telefonos (id, datos) VALUES (1, '[]') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS backups_previos (
  id          BIGSERIAL   PRIMARY KEY,
  tabla       TEXT        NOT NULL,
  clave       TEXT        NOT NULL,
  datos       JSONB       NOT NULL,
  guardado_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS backups_previos_tabla_clave ON backups_previos (tabla, clave, guardado_at DESC);
CREATE TABLE IF NOT EXISTS dispositivos (
  id          TEXT        PRIMARY KEY,
  alias       TEXT        NOT NULL DEFAULT '',
  nombre      TEXT        NOT NULL DEFAULT '',
  user_agent  TEXT        NOT NULL DEFAULT '',
  ip          TEXT        NOT NULL DEFAULT '',
  primera_vez TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_vez  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visitas     INTEGER     NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS presencia (
  device_id   TEXT        PRIMARY KEY,
  device_name TEXT        NOT NULL DEFAULT 'Dispositivo',
  pagina      TEXT        NOT NULL DEFAULT '/',
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Supabase publica las tablas por su API REST: con RLS activo y sin políticas,
-- nadie las lee por ahí. La app entra como dueña de las tablas y no la afecta.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['turnos','caja_diaria','config_servicios','clientes_telefonos','backups_previos','dispositivos','presencia'] LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
END $$;
`;

export const TABLAS = ['turnos', 'caja_diaria', 'config_servicios', 'clientes_telefonos', 'backups_previos', 'dispositivos', 'presencia'];

export async function instalarEsquema(): Promise<void> {
  await query(ESQUEMA);
}

export async function tablasPresentes(): Promise<string[]> {
  const rows = await query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
    [TABLAS]
  );
  return rows.map(r => r.tablename);
}
