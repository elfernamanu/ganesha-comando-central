/**
 * CATÁLOGO DE SERVICIOS Y COMBOS — Módulo compartido
 *
 * PRINCIPIO: una sola fuente de verdad.
 *   - Todos los precios vienen de ganesha_config_servicios (lo que configuró la dueña).
 *   - El bot / webhook recibe SIEMPRE texto limpio (sin emoji).
 *   - nombreDisplay = con emoji (UI) / nombre = sin emoji (bot/storage).
 *
 * Fuentes:
 *   - Promos depilación → ganesha_config_servicios, categoría 'depilacion', subservicios 🎁
 *   - Uñas              → ganesha_config_servicios, categoría 'unas', todos los subservicios
 *   - Estética          → ganesha_config_servicios, categoría 'estetica', todos los subservicios
 *   - Pestañas          → ganesha_config_servicios, categoría 'pestanas', todos los subservicios
 *   - Combos            → ganesha_catalog_combos (guardados en /promociones)
 */

// ── Tipos ──────────────────────────────────────────────────────────────
export interface ItemCatalogo {
  nombre: string;         // clave limpia para bot/webhook: "Semipermanente"
  nombreDisplay: string;  // con emoji para UI: "💅 Semipermanente"
  detalle: string;
  precio: number;
  categoria: string;      // 'depilacion' | 'unas' | 'estetica' | 'pestanas' | 'combo' | 'otro'
}

export type CatalogoPromos = Record<string, ItemCatalogo>;

// ── Quita emojis del inicio de una cadena ─────────────────────────────
export function quitarEmoji(str: string): string {
  return str
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]+\s*/u, '')
    .trim();
}

// ── Claves de localStorage ─────────────────────────────────────────────
const KEY_CONFIG = 'ganesha_config_servicios';
const KEY_COMBOS = 'ganesha_catalog_combos';

// ── Defaults si no hay nada configurado ───────────────────────────────
const DEFAULT_PROMOS: ItemCatalogo[] = [
  { nombre: 'PROMO 1: Rostro completo (Mujer)',    nombreDisplay: '🎁 PROMO 1: Rostro completo (Mujer)',    detalle: '', precio: 20500, categoria: 'depilacion' },
  { nombre: 'PROMO 2: Cavado + Tira de cola',      nombreDisplay: '🎁 PROMO 2: Cavado + Tira de cola',      detalle: '', precio: 22500, categoria: 'depilacion' },
  { nombre: 'PROMO 3: Cuerpo completo sin rostro', nombreDisplay: '🎁 PROMO 3: Cuerpo completo sin rostro', detalle: '', precio: 33000, categoria: 'depilacion' },
  { nombre: 'PROMO 4: Pecho y Abdomen (Hombre)',   nombreDisplay: '🎁 PROMO 4: Pecho y Abdomen (Hombre)',   detalle: '', precio: 26500, categoria: 'depilacion' },
  { nombre: 'PROMO 5: Pelvis y Tira (Hombre)',     nombreDisplay: '🎁 PROMO 5: Pelvis y Tira (Hombre)',     detalle: '', precio: 27000, categoria: 'depilacion' },
  { nombre: 'PROMO 6: Rostro completo (Hombre)',   nombreDisplay: '🎁 PROMO 6: Rostro completo (Hombre)',   detalle: '', precio: 24000, categoria: 'depilacion' },
  { nombre: 'PROMO 7: Cuerpo completo (Hombre)',   nombreDisplay: '🎁 PROMO 7: Cuerpo completo (Hombre)',   detalle: '', precio: 41000, categoria: 'depilacion' },
  { nombre: 'PROMO 8: Brazos y Axilas (Hombre)',   nombreDisplay: '🎁 PROMO 8: Brazos y Axilas (Hombre)',   detalle: '', precio: 30000, categoria: 'depilacion' },
];

const DEFAULT_UNAS: ItemCatalogo[] = [
  { nombre: 'Belleza de Manos',          nombreDisplay: '💅 Belleza de Manos',          detalle: 'c/o sin Tradicional', precio: 18000, categoria: 'unas' },
  { nombre: 'Semipermanente',            nombreDisplay: '💅 Semipermanente',             detalle: '',                     precio: 22000, categoria: 'unas' },
  { nombre: 'Capping (Polygel)',         nombreDisplay: '💅 Capping (Polygel)',          detalle: '',                     precio: 25000, categoria: 'unas' },
  { nombre: 'Esculpidas en Polygel',     nombreDisplay: '💅 Esculpidas en Polygel',      detalle: '',                     precio: 27000, categoria: 'unas' },
  { nombre: 'Belleza de Pies con Semi',  nombreDisplay: '💅 Belleza de Pies con Semi',   detalle: '',                     precio: 22000, categoria: 'unas' },
];

const DEFAULT_ESTETICA: ItemCatalogo[] = [
  { nombre: 'Estética Corporal',      nombreDisplay: '⚡ Estética Corporal',      detalle: '', precio: 20000, categoria: 'estetica' },
  { nombre: 'Himfu / Criofrecuencia', nombreDisplay: '⚡ Himfu / Criofrecuencia', detalle: '', precio: 0,     categoria: 'estetica' },
];

const DEFAULT_PESTANAS: ItemCatalogo[] = [
  { nombre: 'Extensiones Volumen', nombreDisplay: '👁️ Extensiones Volumen', detalle: '', precio: 18000, categoria: 'pestanas' },
  { nombre: 'Lifting + Tinte',     nombreDisplay: '👁️ Lifting + Tinte',     detalle: '', precio: 0,     categoria: 'pestanas' },
  { nombre: 'Relleno',             nombreDisplay: '👁️ Relleno',             detalle: '', precio: 0,     categoria: 'pestanas' },
];

// ── Cache en memoria — evita re-parsear localStorage en cada render ────
// TTL: 2s. Tiempo suficiente para que los precios actualizados se propaguen
// cuando la secretaria navega entre Admin → Turnos.
let _catalogoCache: CatalogoPromos | null = null;
let _catalogoCacheTs = 0;
const CATALOG_CACHE_MS = 2000;

/** Llama esto después de guardar la configuración para forzar re-lectura */
export function invalidarCatalogoCache(): void {
  _catalogoCache = null;
}

// ── API pública ────────────────────────────────────────────────────────

/**
 * Lee el catálogo completo desde ganesha_config_servicios.
 * Si no hay datos, usa defaults.
 * Resultado cacheado 2s en memoria para evitar JSON.parse repetido.
 */
export function leerCatalogo(): CatalogoPromos {
  if (_catalogoCache && Date.now() - _catalogoCacheTs < CATALOG_CACHE_MS) {
    return _catalogoCache;
  }
  const catalogo: CatalogoPromos = {};

  const config = leerConfig();

  // 1) Depilación — 4 categorías separadas por género
  // IMPORTANTE: las zonas MANTIENEN el emoji en la clave para evitar colisión
  // entre "🌸 Brazos" (Mujer, $20k) y "💪 Brazos" (Hombre, $22k)
  const catDepi = config?.find(c => c.id === 'depilacion');
  if (catDepi?.subservicios) {
    for (const s of catDepi.subservicios) {
      if (!s.activo) continue;
      const esMujerZona  = s.nombre.startsWith('🌸');
      const esHombreZona = s.nombre.startsWith('💪');
      const esPromo      = s.nombre.startsWith('🎁') || s.nombre.startsWith('PROMO');
      if (esMujerZona) {
        // Clave = nombre con emoji para no colisionar con hombre
        catalogo[s.nombre] = { nombre: s.nombre, nombreDisplay: s.nombre, detalle: '', precio: s.precio, categoria: 'depilacion_zona_mujer' };
      } else if (esHombreZona) {
        catalogo[s.nombre] = { nombre: s.nombre, nombreDisplay: s.nombre, detalle: '', precio: s.precio, categoria: 'depilacion_zona_hombre' };
      } else if (esPromo && !s.nombre.includes('Hombre')) {
        const clave = quitarEmoji(s.nombre);
        catalogo[clave] = { nombre: clave, nombreDisplay: s.nombre, detalle: '', precio: s.precio, categoria: 'depilacion_mujer' };
      } else if (esPromo && s.nombre.includes('Hombre')) {
        const claveOriginal = quitarEmoji(s.nombre);
        // Renumerar desde 1 contando solo las promos Hombre ya agregadas
        const hombreIdx = Object.values(catalogo).filter(i => i.categoria === 'depilacion_hombre').length + 1;
        const colonIdx  = claveOriginal.indexOf(':');
        const desc      = colonIdx > -1 ? claveOriginal.slice(colonIdx + 1).trim() : claveOriginal;
        const claveBase = claveOriginal.replace(/\s*\d+\s*:.*$/, '').trim();
        const claveNueva = `${claveBase} ${hombreIdx}: ${desc}`;
        const item: ItemCatalogo = { nombre: claveNueva, nombreDisplay: claveNueva, detalle: '', precio: s.precio, categoria: 'depilacion_hombre' };
        catalogo[claveNueva] = item;
        // Alias con nombre original para que turnos viejos sigan resolviendo
        if (claveOriginal !== claveNueva) {
          catalogo[claveOriginal] = { ...item, nombre: claveOriginal };
        }
      }
    }
  } else {
    // Defaults si no hay config
    DEFAULT_PROMOS.filter(p => !p.nombre.includes('Hombre')).forEach(p => { catalogo[p.nombre] = { ...p, categoria: 'depilacion_mujer' }; });
    DEFAULT_PROMOS.filter(p =>  p.nombre.includes('Hombre')).forEach(p => { catalogo[p.nombre] = { ...p, categoria: 'depilacion_hombre' }; });
  }

  // 2) Uñas (todos los subservicios activos)
  const itemsUnas = config
    ? leerSubserviciosCat(config, 'unas', () => true, 'unas')
    : DEFAULT_UNAS;
  itemsUnas.forEach(item => { catalogo[item.nombre] = item; });

  // 3) Estética
  const itemsEstetica = config
    ? leerSubserviciosCat(config, 'estetica', () => true, 'estetica')
    : DEFAULT_ESTETICA;
  itemsEstetica.forEach(item => { catalogo[item.nombre] = item; });

  // 4) Pestañas
  const itemsPestanas = config
    ? leerSubserviciosCat(config, 'pestanas', () => true, 'pestanas')
    : DEFAULT_PESTANAS;
  itemsPestanas.forEach(item => { catalogo[item.nombre] = item; });

  // 5) Combos (guardados por /promociones)
  const combosGuardados = leerDesdeStorage<ItemCatalogo[]>(KEY_COMBOS, []);
  combosGuardados.forEach(item => {
    catalogo[item.nombre] = { ...item, categoria: 'combo' };
  });

  // 6) Nombres genéricos de compatibilidad hacia atrás
  // (turnos guardados antes con 'Uñas', 'Estética', 'Pestañas')
  // → precio 0: la secretaria lo carga a mano
  if (!catalogo['Uñas'])    catalogo['Uñas']    = { nombre: 'Uñas',    nombreDisplay: '💅 Uñas (general)',    detalle: '', precio: 0, categoria: 'unas'     };
  if (!catalogo['Estética']) catalogo['Estética'] = { nombre: 'Estética', nombreDisplay: '⚡ Estética (general)', detalle: '', precio: 0, categoria: 'estetica' };
  if (!catalogo['Pestañas']) catalogo['Pestañas'] = { nombre: 'Pestañas', nombreDisplay: '👁️ Pestañas (general)', detalle: '', precio: 0, categoria: 'pestanas' };

  // 7) Otro (manual siempre)
  catalogo['Otro'] = { nombre: 'Otro', nombreDisplay: 'Otro', detalle: '', precio: 0, categoria: 'otro' };

  _catalogoCache = catalogo;
  _catalogoCacheTs = Date.now();
  return catalogo;
}

/**
 * Busca un tratamiento — acepta con o sin emoji, case-insensitive.
 */
export function buscarEnCatalogo(tratamiento: string): ItemCatalogo | null {
  const catalogo = leerCatalogo();
  if (catalogo[tratamiento]) return catalogo[tratamiento];
  const limpio = quitarEmoji(tratamiento);
  return catalogo[limpio] ?? null;
}

/**
 * Guarda los combos desde /promociones.
 */
export function guardarCombos(
  combos: Array<{
    numero: number;
    nombre: string;
    descripcion: string;
    precio: number;
    activo?: boolean;
    servicios?: { depilacion?: boolean; unas?: boolean; estetica?: boolean; pestanas?: boolean };
  }>
) {
  const items: ItemCatalogo[] = combos
    .filter(c => c.activo !== false)
    .map(c => {
      const serviciosIncluidos = c.servicios
        ? [
            c.servicios.depilacion ? 'Depilación' : '',
            c.servicios.unas       ? 'Uñas'       : '',
            c.servicios.estetica   ? 'Estética'   : '',
            c.servicios.pestanas   ? 'Pestañas'   : '',
          ].filter(Boolean).join(' + ')
        : '';

      return {
        nombre:        `Combo ${c.numero}`,
        nombreDisplay: c.nombre || `Promo Combo ${c.numero}`,
        detalle:       c.descripcion || serviciosIncluidos || c.nombre || `Combo ${c.numero}`,
        precio:        c.precio,
        categoria:     'combo' as const,
      };
    });
  guardarEnStorage(KEY_COMBOS, items);
}

// ── Helpers internos ───────────────────────────────────────────────────

type ConfigCat = {
  id: string;
  subservicios: Array<{ id: number; nombre: string; precio: number; activo: boolean }>;
};

/** Lee y parsea ganesha_config_servicios una vez */
function leerConfig(): ConfigCat[] | null {
  try {
    const raw = localStorage.getItem(KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw) as ConfigCat[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* silencioso */ }
  return null;
}

/** Extrae subservicios activos de una categoría como ItemCatalogo[] */
function leerSubserviciosCat(
  config: ConfigCat[],
  catId: string,
  filtro: (s: { nombre: string; precio: number; activo: boolean }) => boolean,
  categoria: string
): ItemCatalogo[] {
  const cat = config.find(c => c.id === catId);
  if (!cat?.subservicios?.length) return [];

  return cat.subservicios
    .filter(s => s.activo && filtro(s))
    .map(s => ({
      nombre:        quitarEmoji(s.nombre),
      nombreDisplay: s.nombre,
      detalle:       '',
      precio:        s.precio,
      categoria,
    }));
}

function leerDesdeStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* silencioso */ }
  return fallback;
}

function guardarEnStorage(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* silencioso */ }
}
