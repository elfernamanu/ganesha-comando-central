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

/** Detalle de un turno que es un número de celular (como lo detecta la pantalla de Turnos). */
export function celularDeDetalle(detalle: unknown): string | null {
  const limpio = String(detalle ?? '').trim().replace(/[\s\-()+.]/g, '');
  return /^\d{8,15}$/.test(limpio) ? limpio : null;
}
