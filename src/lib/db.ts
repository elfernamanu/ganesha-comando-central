import { Pool } from 'pg';

// Conexión singleton — reutiliza la misma pool en dev y prod
let pool: Pool | null = null;

// DATABASE_URL: base nueva (Supabase/Neon). POSTGRES_URL: base anterior de DigitalOcean.
export function urlBaseDeDatos(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

// Supabase firma con su propia autoridad, que la verificación estricta de pg rechaza:
// se cifra sin verificar la cadena. sslmode se quita de la URL porque pisaría esta opción.
export function opcionesConexion(url: string | undefined): { connectionString?: string; ssl?: false | { rejectUnauthorized: boolean } } {
  if (!url) return { connectionString: url };
  if (/supabase\.(co|com)/.test(url)) {
    return {
      connectionString: url.replace(/([?&])sslmode=[^&]*(&|$)/, (_m, sep: string, fin: string) => (fin ? sep : '')),
      ssl: { rejectUnauthorized: false },
    };
  }
  if (url.includes('sslmode=')) return { connectionString: url };
  return { connectionString: url, ssl: false }; // DigitalOcean: sin SSL
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      ...opcionesConexion(urlBaseDeDatos()),
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
