/**
 * Copia de los datos que este dispositivo tiene guardados en el navegador,
 * para descargarla o subirla al servidor (/api/admin/importar).
 */

export const MARCA_COPIA_AUTO = 'ganesha_copia_auto_v1';

// Claves que el servidor sabe importar
const PARA_SERVIDOR = /^ganesha_(turnos_\d{4}-\d{2}-\d{2}|gastos_\d{4}-\d{2}-\d{2}|clientes_backup|config_servicios|catalog_combos_raw|gastos_fijos_(empresa|personal)_v2)$/;

// Vercel acepta hasta 4,5 MB por pedido: se sube en tandas más chicas
const TAMANO_TANDA = 900_000;

export interface ResumenImportacion {
  diasNuevos: number;
  diasCompletados: number;
  turnosAgregados: number;
  turnosCompletados: number;
  contactosAgregados: number;
  celularesCompletados: number;
  precios: string;
  combos: string;
  gastosEmpresa: string;
  gastosPersonal: string;
  diasConGastos: number;
}

function leerJSON(raw: string | null): unknown {
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

export function leerClavesLocales(): Record<string, unknown> {
  const claves: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('ganesha')) claves[k] = leerJSON(localStorage.getItem(k));
  }
  return claves;
}

export function tieneDatosParaSubir(claves: Record<string, unknown>): boolean {
  return Object.entries(claves).some(([k, v]) => PARA_SERVIDOR.test(k) && Array.isArray(v) && v.length > 0);
}

function armarTandas(claves: Record<string, unknown>): Record<string, unknown>[] {
  const tandas: Record<string, unknown>[] = [];
  let actual: Record<string, unknown> = {};
  let tamano = 0;
  for (const [k, v] of Object.entries(claves)) {
    if (!PARA_SERVIDOR.test(k)) continue;
    const peso = JSON.stringify(v).length + k.length;
    if (tamano > 0 && tamano + peso > TAMANO_TANDA) { tandas.push(actual); actual = {}; tamano = 0; }
    actual[k] = v;
    tamano += peso;
  }
  if (tamano > 0) tandas.push(actual);
  return tandas;
}

const SIN_DATOS = 'sin datos en la copia';

function sumar(a: ResumenImportacion, b: ResumenImportacion): ResumenImportacion {
  const texto = (x: string, y: string) => (x && x !== SIN_DATOS ? x : y || x);
  return {
    diasNuevos: a.diasNuevos + b.diasNuevos,
    diasCompletados: a.diasCompletados + b.diasCompletados,
    turnosAgregados: a.turnosAgregados + b.turnosAgregados,
    turnosCompletados: a.turnosCompletados + b.turnosCompletados,
    contactosAgregados: a.contactosAgregados + b.contactosAgregados,
    celularesCompletados: a.celularesCompletados + b.celularesCompletados,
    precios: texto(a.precios, b.precios),
    combos: texto(a.combos, b.combos),
    gastosEmpresa: texto(a.gastosEmpresa, b.gastosEmpresa),
    gastosPersonal: texto(a.gastosPersonal, b.gastosPersonal),
    diasConGastos: a.diasConGastos + b.diasConGastos,
  };
}

/** Crea las tablas que falten y sube la copia. Nunca borra ni pisa datos del servidor. */
export async function subirCopia(claves: Record<string, unknown>): Promise<ResumenImportacion> {
  const inst = await fetch('/api/admin/instalar', { method: 'POST' });
  const dInst = await inst.json() as { ok: boolean; error?: string };
  if (!dInst.ok) throw new Error(dInst.error || 'No se pudieron preparar las tablas');

  let total: ResumenImportacion = {
    diasNuevos: 0, diasCompletados: 0, turnosAgregados: 0, turnosCompletados: 0,
    contactosAgregados: 0, celularesCompletados: 0,
    precios: '', combos: '', gastosEmpresa: '', gastosPersonal: '', diasConGastos: 0,
  };
  for (const tanda of armarTandas(claves)) {
    const res = await fetch('/api/admin/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claves: tanda }),
    });
    const d = await res.json() as { ok: boolean; error?: string; resumen?: ResumenImportacion };
    if (!d.ok || !d.resumen) throw new Error(d.error || 'El servidor no aceptó la copia');
    total = sumar(total, d.resumen);
  }
  for (const k of ['precios', 'combos', 'gastosEmpresa', 'gastosPersonal'] as const) {
    if (!total[k]) total[k] = SIN_DATOS;
  }
  return total;
}
