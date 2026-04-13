/**
 * CATÁLOGO DE PROMOS Y COMBOS — Módulo compartido
 *
 * La dueña configura promos en /depilacion y combos en /promociones.
 * Esas páginas guardan en localStorage.
 * La secretaria abre /turnos → al elegir un tratamiento, se auto-completa
 * el detalle y el precio desde este catálogo.
 */

// ── Tipos ──────────────────────────────────────────────────────────────
export interface ItemCatalogo {
  nombre: string;       // "Depilación PROMO 1"
  detalle: string;      // "Cuerpo Completo sin rostro"
  precio: number;       // 33000
}

export type CatalogoPromos = Record<string, ItemCatalogo>;

// ── Claves de localStorage ─────────────────────────────────────────────
const KEY_DEPILACION = 'ganesha_catalog_depilacion';
const KEY_COMBOS     = 'ganesha_catalog_combos';

// ── Datos por defecto (coinciden con lo configurado en /depilacion y /promociones) ─
const DEFAULT_DEPILACION: ItemCatalogo[] = [
  { nombre: 'Depilación PROMO 1', detalle: 'Cuerpo Completo sin rostro',             precio: 33000 },
  { nombre: 'Depilación PROMO 2', detalle: 'Rostro completo femenino',               precio: 20500 },
  { nombre: 'Depilación PROMO 3', detalle: 'Cavado Completo + Tira de cola',         precio: 22500 },
  { nombre: 'Depilación PROMO 4', detalle: 'Cavado C. + Pierna E. + Axila + Bozo',  precio: 24000 },
];

const DEFAULT_COMBOS: ItemCatalogo[] = [
  { nombre: 'Promo Combo 1', detalle: 'Depilación completa + Uñas',                       precio: 12000 },
  { nombre: 'Promo Combo 2', detalle: 'Depilación + Uñas + Estética + Pestañas',          precio: 25000 },
];

// ── Servicios simples (precio 0 = la secretaria lo carga manualmente) ─
const SERVICIOS_SIMPLES: ItemCatalogo[] = [
  { nombre: 'Uñas',     detalle: '', precio: 0 },
  { nombre: 'Estética', detalle: '', precio: 0 },
  { nombre: 'Pestañas', detalle: '', precio: 0 },
  { nombre: 'Otro',     detalle: '', precio: 0 },
];

// ── Funciones públicas ─────────────────────────────────────────────────

/**
 * Lee el catálogo completo.
 * Primero intenta localStorage; si no, usa los defaults.
 */
export function leerCatalogo(): CatalogoPromos {
  const catalogo: CatalogoPromos = {};

  // Depilación promos
  const depItems = leerDesdeStorage<ItemCatalogo[]>(KEY_DEPILACION, DEFAULT_DEPILACION);
  depItems.forEach(item => {
    catalogo[item.nombre] = item;
  });

  // Combos
  const comboItems = leerDesdeStorage<ItemCatalogo[]>(KEY_COMBOS, DEFAULT_COMBOS);
  comboItems.forEach(item => {
    catalogo[item.nombre] = item;
  });

  // Servicios simples
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
 * Guarda las promos de depilación desde la página /depilacion.
 * Llama esto en el onGuardar de esa página.
 */
export function guardarPromosDepilacion(promos: Array<{ nombre: string; descripcion: string; precio: number }>) {
  const items: ItemCatalogo[] = promos.map(p => ({
    nombre:  normalizarNombrePromo(p.nombre),
    detalle: p.descripcion,
    precio:  p.precio,
  }));
  guardarEnStorage(KEY_DEPILACION, items);
}

/**
 * Guarda los combos desde la página /promociones.
 * Llama esto en el onGuardar de esa página.
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
    // silencioso si localStorage no disponible
  }
}

/**
 * Normaliza nombres: "Depilacion PROMO 1" → "Depilación PROMO 1"
 * Para que coincida con el type Tratamiento del módulo turnos
 */
function normalizarNombrePromo(nombre: string): string {
  return nombre
    .replace(/^Depilacion\s/i, 'Depilación ')
    .replace(/^depilacion\s/i, 'Depilación ');
}
