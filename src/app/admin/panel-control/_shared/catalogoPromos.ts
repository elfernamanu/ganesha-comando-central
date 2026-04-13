/**
 * CATÁLOGO DE PROMOS Y COMBOS — Módulo compartido
 *
 * Las promos de depilación vienen de ganesha_config_servicios (Configuración de Servicios).
 * Los combos vienen de ganesha_catalog_combos (página /promociones).
 * La secretaria abre /turnos → al elegir un tratamiento, se auto-completa
 * el detalle y el precio desde este catálogo.
 */

// ── Tipos ──────────────────────────────────────────────────────────────
export interface ItemCatalogo {
  nombre: string;       // "🎁 PROMO 1: Rostro completo (Mujer)"
  detalle: string;      // detalle del servicio
  precio: number;       // 33000
}

export type CatalogoPromos = Record<string, ItemCatalogo>;

// ── Claves de localStorage ─────────────────────────────────────────────
const KEY_CONFIG   = 'ganesha_config_servicios';  // fuente principal (precios)
const KEY_COMBOS   = 'ganesha_catalog_combos';    // combos de /promociones

// ── Datos por defecto si localStorage está vacío ──────────────────────
const DEFAULT_PROMOS_DEPILACION: ItemCatalogo[] = [
  { nombre: '🎁 PROMO 1: Rostro completo (Mujer)',    detalle: 'Bozo + Mentón + Patillas + Mejillas', precio: 20500 },
  { nombre: '🎁 PROMO 2: Cavado + Tira de cola',      detalle: 'Cavado + Tira de cola',               precio: 22500 },
  { nombre: '🎁 PROMO 3: Cuerpo completo sin rostro', detalle: 'Cuerpo completo sin rostro (Mujer)',   precio: 33000 },
  { nombre: '🎁 PROMO 4: Pecho y Abdomen (Hombre)',   detalle: 'Pecho y Abdomen',                     precio: 26500 },
  { nombre: '🎁 PROMO 5: Pelvis y Tira (Hombre)',     detalle: 'Pelvis completa + Tira de cola',       precio: 27000 },
  { nombre: '🎁 PROMO 6: Rostro completo (Hombre)',   detalle: 'Bozo + Mentón + Patillas',             precio: 24000 },
  { nombre: '🎁 PROMO 7: Cuerpo completo (Hombre)',   detalle: 'Cuerpo completo',                      precio: 41000 },
  { nombre: '🎁 PROMO 8: Brazos y Axilas (Hombre)',   detalle: 'Brazos + Axilas',                      precio: 30000 },
];

const DEFAULT_COMBOS: ItemCatalogo[] = [
  { nombre: 'Promo Combo 1', detalle: 'Depilación completa + Uñas',               precio: 12000 },
  { nombre: 'Promo Combo 2', detalle: 'Depilación + Uñas + Estética + Pestañas', precio: 25000 },
];

// ── Servicios simples ─────────────────────────────────────────────────
const SERVICIOS_SIMPLES: ItemCatalogo[] = [
  { nombre: 'Uñas',     detalle: '', precio: 0 },
  { nombre: 'Estética', detalle: '', precio: 0 },
  { nombre: 'Pestañas', detalle: '', precio: 0 },
  { nombre: 'Otro',     detalle: '', precio: 0 },
];

// ── Funciones públicas ─────────────────────────────────────────────────

/**
 * Lee el catálogo completo.
 * Las promos de depilación vienen de ganesha_config_servicios (categoría 'depilacion').
 * Los combos vienen de ganesha_catalog_combos.
 */
export function leerCatalogo(): CatalogoPromos {
  const catalogo: CatalogoPromos = {};

  // 1) Promos de depilación desde Configuración de Servicios
  const depItems = leerPromosDesdeConfig();
  depItems.forEach(item => {
    catalogo[item.nombre] = item;
  });

  // 2) Combos desde /promociones
  const comboItems = leerDesdeStorage<ItemCatalogo[]>(KEY_COMBOS, DEFAULT_COMBOS);
  comboItems.forEach(item => {
    catalogo[item.nombre] = item;
  });

  // 3) Servicios simples (siempre disponibles)
  SERVICIOS_SIMPLES.forEach(item => {
    catalogo[item.nombre] = item;
  });

  return catalogo;
}

/**
 * Busca un tratamiento en el catálogo.
 * Retorna null si no existe o es servicio simple sin precio.
 */
export function buscarEnCatalogo(tratamiento: string): ItemCatalogo | null {
  const catalogo = leerCatalogo();
  return catalogo[tratamiento] ?? null;
}

/**
 * Guarda los combos desde la página /promociones.
 */
export function guardarCombos(combos: Array<{ numero: number; nombre: string; descripcion: string; precio: number }>) {
  const items: ItemCatalogo[] = combos.map(c => ({
    nombre:  `Promo Combo ${c.numero}`,
    detalle: c.descripcion || c.nombre,
    precio:  c.precio,
  }));
  guardarEnStorage(KEY_COMBOS, items);
}

// ── Helpers internos ───────────────────────────────────────────────────

/**
 * Lee las promos de depilación (subservicios que empiezan con 🎁)
 * desde ganesha_config_servicios → categoría 'depilacion'.
 * Si no hay datos, usa los defaults.
 */
function leerPromosDesdeConfig(): ItemCatalogo[] {
  try {
    const raw = localStorage.getItem(KEY_CONFIG);
    if (raw) {
      const categorias = JSON.parse(raw) as Array<{
        id: string;
        subservicios: Array<{ id: number; nombre: string; precio: number; activo: boolean }>;
      }>;
      const depilacion = categorias.find(c => c.id === 'depilacion');
      if (depilacion?.subservicios?.length) {
        const promos = depilacion.subservicios
          .filter(s => s.activo && s.nombre.startsWith('🎁'));
        if (promos.length > 0) {
          return promos.map(s => ({
            nombre:  s.nombre,
            detalle: '',
            precio:  s.precio,
          }));
        }
      }
    }
  } catch {
    // silencioso
  }
  return DEFAULT_PROMOS_DEPILACION;
}

function leerDesdeStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // silencioso
  }
  return fallback;
}

function guardarEnStorage(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // silencioso
  }
}
