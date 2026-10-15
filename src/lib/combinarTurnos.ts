/**
 * Cómo se juntan dos versiones del mismo turno (dos dispositivos, o servidor y copia)
 * sin perder ningún dato. Lo usan la importación del servidor y el backup completo.
 */

export type Registro = Record<string, unknown>;

const vacio = (v: unknown) => v === undefined || v === null || v === '' || v === 0;
const num = (v: unknown) => Number(v) || 0;

export function claveTurno(t: Registro): string {
  return typeof t.id === 'string' && t.id ? t.id : `${t.horario ?? ''}|${String(t.clienteNombre ?? '').trim().toLowerCase()}`;
}

// Lo que ya tiene `base` se respeta; lo vacío se completa con `otra`;
// la seña y el extra se quedan con el mayor (un cobro registrado no se pierde)
export function combinarTurno(base: Registro, otra: Registro): Registro {
  const out: Registro = { ...base };
  for (const [k, v] of Object.entries(otra)) {
    if (vacio(out[k]) && !vacio(v)) out[k] = v;
  }
  // La forma de pago acompaña al cobro: si `otra` registró más cobro, su forma de pago es la real
  if (num(otra['seña_pagada']) > num(base['seña_pagada']) && !vacio(otra.metodo_pago)) {
    out.metodo_pago = otra.metodo_pago;
  }
  out.extra = Math.max(num(base.extra), num(otra.extra));
  const total = num(out.monto_total) + num(out.extra);
  let sena = Math.max(num(base['seña_pagada']), num(otra['seña_pagada']));
  if (total > 0 && sena > total) sena = total;
  out['seña_pagada'] = sena;
  out.estado_pago = sena === 0 ? 'sin_pago' : (total > 0 && sena >= total) ? 'completo' : 'seña';
  return out;
}

/** Une dos listas de turnos de un mismo día: ninguno se pierde, los repetidos se combinan. */
export function unirTurnos(base: Registro[], otra: Registro[]): Registro[] {
  const porClave = new Map(otra.map(t => [claveTurno(t), t]));
  const combinados = base.map(t => {
    const o = porClave.get(claveTurno(t));
    return o ? combinarTurno(t, o) : t;
  });
  const enBase = new Set(base.map(claveTurno));
  const nuevos = otra.filter(t => !enBase.has(claveTurno(t)));
  return [...combinados, ...nuevos].sort((a, b) => String(a.horario ?? '').localeCompare(String(b.horario ?? '')));
}

/** Números de teléfono escritos dentro de un texto ("cel hija 11 5555-0001", "1168824263"). */
export function extraerCelulares(texto: unknown): string[] {
  const encontrados = String(texto ?? '').match(/\+?\d[\d\s\-().]{6,20}\d/g) ?? [];
  const out: string[] = [];
  for (const e of encontrados) {
    const digitos = e.replace(/\D/g, '');
    if (digitos.length >= 8 && digitos.length <= 15 && !out.includes(digitos)) out.push(digitos);
  }
  return out;
}

/** Primer número de celular escrito en el detalle de un turno. */
export function celularDeDetalle(detalle: unknown): string | null {
  return extraerCelulares(detalle)[0] ?? null;
}

/**
 * Celular argentino al formato que exige WhatsApp: +54 9 <área sin 0> <número sin 15>.
 * `aviso` vacío = número confiable; si no, explica qué revisar.
 */
export function normalizarCelularAR(crudo: string): { whatsapp: string; aviso: string } {
  let d = String(crudo ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('54')) { d = d.slice(2); if (d.startsWith('9')) d = d.slice(1); }
  if (d.startsWith('0')) d = d.slice(1);
  // "15" después del código de área: 11 15 5555 0001 → 11 5555 0001
  if (d.length === 12) {
    for (const largoArea of d.startsWith('11') ? [2] : [3, 4, 2]) {
      if (d.slice(largoArea, largoArea + 2) === '15') { d = d.slice(0, largoArea) + d.slice(largoArea + 2); break; }
    }
  }
  if (d.length === 10) return { whatsapp: `+549${d}`, aviso: '' };
  if (d.length === 8) return { whatsapp: `+54911${d}`, aviso: 'sin código de área: se asumió 11' };
  return { whatsapp: '', aviso: `número incompleto o con dígitos de más (${d.length} dígitos)` };
}
