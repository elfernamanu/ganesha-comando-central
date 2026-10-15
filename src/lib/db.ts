import { Pool } from 'pg';

// Conexión singleton — reutiliza la misma pool en dev y prod
let pool: Pool | null = null;

// DATABASE_URL: base nueva (Neon/Vercel). POSTGRES_URL: base anterior de DigitalOcean.
export function urlBaseDeDatos(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = urlBaseDeDatos();
    pool = new Pool({
      connectionString,
      // Si la URL trae sslmode (Neon, Supabase) manda la URL; la base vieja de DigitalOcean no usa SSL
      ...(connectionString?.includes('sslmode=') ? {} : { ssl: false }),
      max: 5,                            // Serverless: pocas conexiones por instancia (evita agotar el límite del DB)
      idleTimeoutMillis: 60000,          // Mantener conexiones idle 60s (reduce cold reconnects)
      connectionTimeoutMillis: 4000,     // Timeout de adquisición de conexión
      keepAlive: true,                   // Mantener TCP vivo → evita drops silenciosos
      keepAliveInitialDelayMillis: 10000,// Primer keepalive a los 10s de idle
    });

    // Log de errores de pool para diagnóstico
    pool.on('error', (err) => {
      console.error('[DB pool error]', err.message);
    });
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}
