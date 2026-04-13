/**
 * CATÁLOGO DE PROMOS Y COMBOS — Módulo compartido
 *
 * PRINCIPIO: separación display ↔ datos.
 *   - La UI muestra nombres CON emoji (bonito para la secretaria).
 *   - El bot / webhook recibe SIEMPRE texto limpio (sin emoji).
 *   - El campo `nombre` en ItemCatalogo es la clave limpia (sin emoji).
 *   - El campo `nombreDisplay` es el nombre con emoji para la UI.
 *
 * Fuentes de datos:
 *   - Promos depilación → ganesha_config_servicios (Configuración de Servicios)
 *   - Combos           → ganesha_catalog_combos (/promociones)
 */

// ── Tipos ──────────────────────────────────────────────────────────────
export interface ItemCatalogo {
  nombre: string;         // clave limpia para bot/webhook: "PROMO 1: Rostro completo (Mujer)"
  nombreDisplay: string;  // nombre con emoji para UI: "🎁 PROMO 1: Rostro completo (Mujer)"
  detalle: string;
  precio: number;
}

export type CatalogoPromos = Record<string, ItemCatalogo>;

// ── Utilidad: quitar emojis del inicio de una cadena ──────────────────
// Aplica en la capa de salida (catálogo → bot/webhook).
export function quitarEmoji(str: string): string {
  // Elimina emojis Unicode al inicio y el espacio que los sigue
  return str
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FEFF}]+\s*/u, '')
    .trim();
}

// ── Claves de localStorage ─────────────────────────────────────────────
const KEY_CONFIG = 'ganesha_config_servicios'; // fuente de depilación
const KEY_COMBOS = 'ganesha_catalog_combos';   // fuente de combos

// ── Defaults (si localStorage está vacío) ─────────────────────────────
const DEFAULT_PROMOS_DEPILACION: ItemCatalogo[] = [
  { nombre: 'PROMO 1: Rostro completo (Mujer)',    nombreDisplay: '🎁 PROMO 1: Rostro completo (Mujer)',    detalle: 'Bozo + Mentón + Patillas + Mejillas',      precio: 20500 },
  { nombre: 'PROMO 2: Cavado + Tira de cola',      nombreDisplay: '🎁 PROMO 2: Cavado + Tira de cola',      detalle: 'Cavado + Tira de cola',                     precio: 22500 },
  { nombre: 'PROMO 3: Cuerpo completo sin rostro', nombreDisplay: '🎁 PROMO 3: Cuerpo completo sin rostro', detalle: 'Cuerpo completo sin rostro (Mujer)',          precio: 33000 },
  { nombre: 'PROMO 4: Pecho y Abdomen (Hombre)',   nombreDisplay: '🎁 PROMO 4: Pecho y Abdomen (Hombre)',   detalle: 'Pecho y Abdomen',                             precio: 26500 },
  { nombre: 'PROMO 5: Pelvis y Tira (Hombre)',     nombreDisplay: '🎁 PROMO 5: Pelvis y Tira (Hombre)',     detalle: 'Pelvis completa + Tira de cola',               precio: 27000 },
  { nombre: 'PROMO 6: Rostro completo (Hombre)',   nombreDisplay: '🎁 PROMO 6: Rostro completo (Hombre)',   detalle: 'Bozo + Mentón + Patillas',                    precio: 24000 },
  { nombre: 'PROMO 7: Cuerpo completo (Hombre)',   nombreDisplay: '🎁 PROMO 7: Cuerpo completo (Hombre)',   detalle: 'Cuerpo completo',                              precio: 41000 },
  { nombre: 'PROMO 8: Brazos y Axilas (Hombre)',   nombreDisplay: '🎁 PROMO 8: Brazos y Axilas (Hombre)',   detalle: 'Brazos + Axilas',                              precio: 30000 },
];

const DEFAULT_COMBOS: ItemCatalogo[] = [
  { nombre: 'Combo 1', nombreDisplay: 'Promo Combo 1', detalle: 'Depilación completa + Uñas',               precio: 12000 },
  { nombre: 'Combo 2', nombreDisplay: 'Promo Combo 2', detalle: 'Depilación + Uñas + Estética + Pestañas', precio: 25000 },
];

const SERVICIOS_SIMPLES: ItemCatalogo[] = [
  { nombre: 'Uñas',     nombreDisplay: 'Uñas',     detalle: '', precio: 0 },
  { nombre: 'Estética', nombreDisplay: 'Estética', detalle: '', precio: 0 },
  { nombre: 'Pestañas', nombreDisplay: 'Pestañas', detalle: '', precio: 0 },
  { nombre: 'Otro',     nombreDisplay: 'Otro',     detalle: '', precio: 0 },
];

// ── API pública ────────────────────────────────────────────────────────

/**
 * Lee el catálogo completo.
 * La clave del Record es `nombre` (limpio, sin emoji) → lo que recibe el bot.
 * Cada ítem tiene `nombreDisplay` con emoji → lo que ve la secretaria.
 */
export function leerCatalogo(): CatalogoPromos {
  const catalogo: CatalogoPromos = {};

  leerPromosDesdeConfig().forEach(item => {
    catalogo[item.nombre] = item;
  });

  leerDesdeStorage<ItemCatalogo[]>(KEY_COMBOS, DEFAULT_COMBOS).forEach(item => {
    catalogo[item.nombre] = item;
  });

  SERVICIOS_SIMPLES.forEach(item => {
    catalogo[item.nombre] = item;
  });

  return catalogo;
}

/**
 * Busca un tratamiento por su nombre limpio o por display.
 * Tolerante: acepta con o sin emoji.
 */
export function buscarEnCatalogo(tratamiento: string): ItemCatalogo | null {
  const catalogo = leerCatalogo();
  // Busca por clave limpia primero
  if (catalogo[tratamiento]) return catalogo[tratamiento];
  // Fallback: busca quitando el emoji del input
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
    .filter(c => c.activo !== false)   // solo los activos llegan al catálogo
    .map(c => {
      // Construir detalle combinando descripción + servicios incluidos
      const serviciosIncluidos = c.servicios
        ? [
            c.servicios.depilacion ? 'Depilación' : '',
            c.servicios.unas       ? 'Uñas'       : '',
            c.servicios.estetica   ? 'Estética'   : '',
            c.servicios.pestanas   ? 'Pestañas'   : '',
          ].filter(Boolean).join(' + ')
        : '';

      const detalle = c.descripcion || serviciosIncluidos || c.nombre;

      return {
        nombre:        `Combo ${c.numero}`,
        nombreDisplay: c.nombre || `Promo Combo ${c.numero}`,
        detalle,
        precio: c.precio,
      };
    });
  guardarEnStorage(KEY_COMBOS, items);
}

// ── Helpers internos ───────────────────────────────────────────────────

/**
 * Lee subservicios 🎁 de la categoría 'depilacion' en ganesha_config_servicios.
 * Usa quitarEmoji() para generar la clave limpia (bot).
 * Guarda el nombre original con emoji como nombreDisplay (UI).
 */
function leerPromosDesdeConfig(): ItemCatalogo[] {
  try {
    const raw = localStorage.getItem(KEY_CONFIG);
    if (raw) {
      const categorias = JSON.parse(raw) as Array<{
        id: string;
        subservicios: Array<{ id: number; nombre: string; precio: number; activo: boolean }>;
      }>;
      const depi = categorias.find(c => c.id === 'depilacion');
      if (depi?.subservicios?.length) {
        const promos = depi.subservicios.filter(s => s.activo && s.nombre.startsWith('🎁'));
        if (promos.length > 0) {
          return promos.map(s => ({
            nombre:        quitarEmoji(s.nombre), // limpio → bot
            nombreDisplay: s.nombre,              // con emoji → UI
            detalle:       '',
            precio:        s.precio,
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
