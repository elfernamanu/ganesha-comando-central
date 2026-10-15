import { Pool } from 'pg';

// Conexión singleton — reutiliza la misma pool en dev y prod
let pool: Pool | null = null;

// DATABASE_URL: base nueva (Supabase/Neon). POSTGRES_URL: base anterior de DigitalOcean.
export function urlBaseDeDatos(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

// Supabase firma con su propia autoridad, que la verificación estricta de pg rechaza:
// se cifra sin verificar la cadena. sslmode se quita de la URL porque pisaría esta opción.
// Una clave con @ # / ? : pegada sin codificar rompe la dirección: se codifica acá.
// Si ya venía codificada (%40...) se decodifica primero para no codificarla dos veces.
export function normalizarUrl(url: string): string {
  const m = url.trim().match(/^(postgres(?:ql)?:\/\/)([^:@/]+):(.*)@([^@]+)$/);
  if (!m) return url.trim();
  const [, esquema, usuario, clave, resto] = m;
  let real = clave;
  try { real = decodeURIComponent(clave); } catch { /* % sueltos: la clave se usa tal cual */ }
  // Al reemplazar [YOUR-PASSWORD] es común dejar los corchetes: una clave de Supabase nunca los lleva
  if (real.length > 2 && real.startsWith('[') && real.endsWith(']')) real = real.slice(1, -1);
  return `${esquema}${usuario}:${encodeURIComponent(real)}@${resto}`;
}

// Errores de configuración que se pueden detectar sin conectarse
export function problemaDeConfiguracion(url = urlBaseDeDatos()): string | null {
  if (!url) return 'Falta configurar DATABASE_URL en Vercel';
  let legible = url;
  try { legible = decodeURIComponent(url); } catch { /* se revisa tal cual */ }
  if (/\[?\s*(YOUR|TU|SU)[-_ ]?(PASSWORD|CONTRASE[ÑN]A|CLAVE)\s*\]?/i.test(legible)) {
    return 'En la dirección quedó el texto de ejemplo de Supabase ([TU-CONTRASEÑA] o [YOUR-PASSWORD]): borralo y escribí tu clave en ese lugar';
  }
  if (/\s/.test(url.trim())) return 'La dirección de la base tiene espacios o saltos de línea en el medio: pegala de nuevo, todo junto';
  if (/^postgres(?:ql)?:\/\/[^:@/]+:@/i.test(url.trim())) return 'La dirección no tiene clave: falta escribirla después de los dos puntos';
  if (/@db\.[a-z0-9]+\.supabase\.co/i.test(url)) return 'DATABASE_URL usa la conexión directa de Supabase, que Vercel no alcanza: copiá la dirección de "Transaction pooler" (puerto 6543)';
  return null;
}

export function explicarErrorDeConexion(err: unknown): string {
  const msg = String((err as Error)?.message ?? err);
  if (/password authentication failed/i.test(msg)) return 'La clave de la base es incorrecta. Si la acabás de cambiar en Supabase, esperá 3 minutos y recargá. Si sigue, revisá que en Vercel esté la clave nueva y volvé a desplegar';
  if (/tenant or user not found/i.test(msg)) return 'El usuario de la dirección no corresponde al proyecto. Copiá de nuevo la dirección completa desde Supabase → Connect';
  if (/ENOTFOUND|getaddrinfo/i.test(msg)) return 'No se encuentra el servidor de la base. Revisá que la dirección esté completa';
  if (/ENETUNREACH|EHOSTUNREACH/i.test(msg)) return 'No se llega al servidor de la base. En Supabase usá la dirección de "Transaction pooler"';
  if (/timeout|ETIMEDOUT/i.test(msg)) return 'La base no responde. Fijate en Supabase si el proyecto está pausado';
  if (/Invalid URL/i.test(msg)) return 'La dirección de la base está mal escrita. Copiala de nuevo desde Supabase → Connect';
  return msg;
}

// Para el diagnóstico: a qué servidor y con qué usuario se conecta, sin la clave
export function describirConexion(url = urlBaseDeDatos()): Record<string, string> | null {
  if (!url) return null;
  try {
    const u = new URL(normalizarUrl(url));
    const clave = decodeURIComponent(u.password);
    return {
      usuario: decodeURIComponent(u.username),
      servidor: u.hostname,
      puerto: u.port || '5432',
      clave: clave ? `${clave.length} caracteres` : 'falta',
    };
  } catch {
    return { error: 'La dirección está mal escrita' };
  }
}

export function opcionesConexion(url: string | undefined): { connectionString?: string; ssl?: false | { rejectUnauthorized: boolean } } {
  if (!url) return { connectionString: url };
  url = normalizarUrl(url);
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
