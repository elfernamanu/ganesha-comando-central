/**
 * Backup completo de la app: junta lo que hay en el servidor y en este dispositivo
 * (sin perder nada de ninguno) y lo exporta como documento legible, planillas para
 * Excel y un archivo que se puede volver a subir para restaurar todo.
 */
import { unirTurnos, extraerCelulares, normalizarCelularAR, type Registro } from './combinarTurnos';

export interface DatosBackup {
  generado: string;
  origen: string[];
  turnos: Record<string, Registro[]>;
  contactos: Registro[];
  borrados: string[];
  servicios: Registro[];
  combos: Registro[];
  gastosEmpresa: Registro[];
  gastosPersonal: Registro[];
  gastosCaja: Record<string, Registro[]>;
  cajaCerrada: Record<string, boolean>;
}

export interface ClienteBackup {
  nombre: string;
  celular: string;
  /** Formato internacional para WhatsApp (+549…); vacío si el número no sirve */
  whatsapp: string;
  /** Qué revisar del número (vacío = confiable) */
  revisar: string;
  /** Otros números encontrados para la misma clienta */
  otrosNumeros: string[];
  notas: string;
  turnos: number;
  vino: number;
  falto: number;
  primerTurno: string;
  ultimoTurno: string;
  servicioFrecuente: string;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function lista(v: unknown): Registro[] {
  return Array.isArray(v) ? v.filter((x): x is Registro => !!x && typeof x === 'object') : [];
}

function vacios(origen: string): DatosBackup {
  return {
    generado: new Date().toISOString(), origen: [origen],
    turnos: {}, contactos: [], borrados: [], servicios: [], combos: [],
    gastosEmpresa: [], gastosPersonal: [], gastosCaja: {}, cajaCerrada: {},
  };
}

// ── Lectura de cada fuente ────────────────────────────────────────────────────

export function desdeDispositivo(claves: Record<string, unknown>): DatosBackup {
  const d = vacios('este dispositivo');
  for (const [k, v] of Object.entries(claves)) {
    if (k.startsWith('ganesha_turnos_')) {
      const f = k.slice('ganesha_turnos_'.length);
      if (FECHA.test(f) && lista(v).length > 0) d.turnos[f] = lista(v);
    } else if (k.startsWith('ganesha_gastos_') && !k.startsWith('ganesha_gastos_fijos')) {
      const f = k.slice('ganesha_gastos_'.length);
      if (FECHA.test(f) && lista(v).length > 0) d.gastosCaja[f] = lista(v);
    }
  }
  d.contactos = lista(claves['ganesha_clientes_backup']);
  d.borrados = Array.isArray(claves['ganesha_clientes_borrados']) ? (claves['ganesha_clientes_borrados'] as unknown[]).map(String) : [];
  d.servicios = lista(claves['ganesha_config_servicios']);
  d.combos = lista(claves['ganesha_catalog_combos_raw']);
  d.gastosEmpresa = lista(claves['ganesha_gastos_fijos_empresa_v2']);
  d.gastosPersonal = lista(claves['ganesha_gastos_fijos_personal_v2']);
  return d;
}

/** A partir de la exportación completa del servidor (GET /api/backup). */
export function desdeServidor(exp: Record<string, unknown>): DatosBackup {
  const d = vacios('servidor');
  const datosDe = (filas: unknown) => lista(lista(filas)[0]?.datos);
  for (const fila of lista(exp.turnos)) {
    const f = String(fila.fecha ?? '').slice(0, 10);
    if (FECHA.test(f) && lista(fila.datos).length > 0) d.turnos[f] = lista(fila.datos);
  }
  for (const fila of lista(exp.caja_diaria)) {
    const f = String(fila.fecha ?? '').slice(0, 10);
    if (!FECHA.test(f)) continue;
    const gastos = lista((fila.datos as Registro | undefined)?.gastos);
    if (gastos.length > 0) d.gastosCaja[f] = gastos;
    if (fila.cerrada) d.cajaCerrada[f] = true;
  }
  d.contactos = datosDe(exp.clientes);
  d.servicios = datosDe(exp.config_servicios);
  d.combos = datosDe(exp.combos);
  d.gastosEmpresa = datosDe(exp.gastos_fijos_empresa);
  d.gastosPersonal = datosDe(exp.gastos_fijos_personal);
  return d;
}

/** Junta dos fuentes sin perder nada: turnos y contactos se unen, lo demás se completa. */
export function unir(a: DatosBackup, b: DatosBackup): DatosBackup {
  const turnos: Record<string, Registro[]> = { ...a.turnos };
  for (const [f, lista2] of Object.entries(b.turnos)) turnos[f] = turnos[f] ? unirTurnos(turnos[f], lista2) : lista2;

  const porNombre = new Map(a.contactos.map(c => [String(c.nombre ?? '').trim().toLowerCase(), { ...c }]));
  for (const c of b.contactos) {
    const k = String(c.nombre ?? '').trim().toLowerCase();
    if (!k) continue;
    const ya = porNombre.get(k);
    if (!ya) porNombre.set(k, { ...c });
    else {
      if (!ya.celular && c.celular) ya.celular = c.celular;
      if (!ya.notas && c.notas) ya.notas = c.notas;
    }
  }

  const gastosCaja = { ...a.gastosCaja };
  for (const [f, g] of Object.entries(b.gastosCaja)) if (!gastosCaja[f]?.length) gastosCaja[f] = g;

  const primero = (x: Registro[], y: Registro[]) => (x.length > 0 ? x : y);
  return {
    generado: new Date().toISOString(),
    origen: [...new Set([...a.origen, ...b.origen])],
    turnos,
    contactos: [...porNombre.values()],
    borrados: [...new Set([...a.borrados, ...b.borrados])],
    servicios: primero(a.servicios, b.servicios),
    combos: primero(a.combos, b.combos),
    gastosEmpresa: primero(a.gastosEmpresa, b.gastosEmpresa),
    gastosPersonal: primero(a.gastosPersonal, b.gastosPersonal),
    gastosCaja,
    cajaCerrada: { ...b.cajaCerrada, ...a.cajaCerrada },
  };
}

// ── Clientes: de la lista de contactos, de cada turno y de los celulares anotados ──

interface ClienteEnArmado {
  nombre: string; notas: string; turnos: number; vino: number; falto: number;
  primerTurno: string; ultimoTurno: string;
  servicios: Map<string, number>; tieneFicha: boolean;
  numeroFicha: string;      // el que figura en Contactos: es el principal
  numeros: string[];        // todos los encontrados (ficha, notas, detalle de turnos)
}

export function clientesConsolidados(d: DatosBackup): ClienteBackup[] {
  const borrados = new Set(d.borrados.map(n => n.trim().toLowerCase()));
  const mapa = new Map<string, ClienteEnArmado>();
  const obtener = (nombre: string, tieneFicha: boolean) => {
    const k = nombre.trim().toLowerCase();
    let c = mapa.get(k);
    if (!c) {
      c = { nombre: nombre.trim(), notas: '', turnos: 0, vino: 0, falto: 0, primerTurno: '', ultimoTurno: '', servicios: new Map(), tieneFicha, numeroFicha: '', numeros: [] };
      mapa.set(k, c);
    }
    if (tieneFicha) c.tieneFicha = true;
    return c;
  };
  const sumarNumeros = (c: ClienteEnArmado, texto: unknown) => {
    for (const n of extraerCelulares(texto)) if (!c.numeros.includes(n)) c.numeros.push(n);
  };

  for (const ficha of d.contactos) {
    const nombre = String(ficha.nombre ?? '').trim();
    if (!nombre) continue;
    const c = obtener(nombre, true);
    const cel = String(ficha.celular ?? '').replace(/\D/g, '');
    if (cel && !c.numeroFicha) c.numeroFicha = cel;
    sumarNumeros(c, ficha.celular);
    sumarNumeros(c, ficha.notas);
    c.notas = c.notas || String(ficha.notas ?? '').trim();
  }

  for (const [fecha, turnos] of Object.entries(d.turnos)) {
    for (const t of turnos) {
      const nombre = String(t.clienteNombre ?? '').trim();
      if (!nombre) continue;
      const c = obtener(nombre, false);
      c.turnos++;
      if (t.asistencia === 'presente') c.vino++;
      if (t.asistencia === 'no_vino') c.falto++;
      if (!c.primerTurno || fecha < c.primerTurno) c.primerTurno = fecha;
      if (!c.ultimoTurno || fecha > c.ultimoTurno) c.ultimoTurno = fecha;
      const trat = String(t.tratamiento ?? '').trim();
      if (trat && trat !== 'Otro') c.servicios.set(trat, (c.servicios.get(trat) ?? 0) + 1);
      sumarNumeros(c, t.detalle);
    }
  }

  const clientes = [...mapa.entries()]
    .filter(([k, c]) => c.tieneFicha || !borrados.has(k))
    .map(([, c]): ClienteBackup => {
      let servicioFrecuente = '', max = 0;
      for (const [s, n] of c.servicios) if (n > max) { max = n; servicioFrecuente = s; }
      // Principal: el de Contactos; si no hay, el primero con forma de celular válida
      const principal = c.numeroFicha
        || c.numeros.find(n => !normalizarCelularAR(n).aviso)
        || c.numeros[0] || '';
      const { whatsapp, aviso } = principal ? normalizarCelularAR(principal) : { whatsapp: '', aviso: '' };
      return {
        nombre: c.nombre, celular: principal, whatsapp, revisar: aviso,
        otrosNumeros: c.numeros.filter(n => n !== principal),
        notas: c.notas, turnos: c.turnos, vino: c.vino, falto: c.falto,
        primerTurno: c.primerTurno, ultimoTurno: c.ultimoTurno, servicioFrecuente,
      };
    })
    .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'));

  // Mismo número en dos clientas (madre e hija, o un error de carga)
  const porWhatsapp = new Map<string, string[]>();
  for (const c of clientes) if (c.whatsapp) porWhatsapp.set(c.whatsapp, [...(porWhatsapp.get(c.whatsapp) ?? []), c.nombre]);
  for (const c of clientes) {
    const otras = (porWhatsapp.get(c.whatsapp) ?? []).filter(n => n !== c.nombre);
    if (otras.length > 0) c.revisar = [c.revisar, `mismo número que ${otras.join(', ')}`].filter(Boolean).join('; ');
  }
  return clientes;
}

// ── Totales ───────────────────────────────────────────────────────────────────

const num = (v: unknown) => Number(v) || 0;

export function totales(d: DatosBackup) {
  const clientes = clientesConsolidados(d);
  let turnos = 0, vino = 0, falto = 0, cobrado = 0;
  for (const lista2 of Object.values(d.turnos)) {
    for (const t of lista2) {
      turnos++;
      if (t.asistencia === 'presente') vino++;
      if (t.asistencia === 'no_vino') falto++;
      cobrado += num(t['seña_pagada']);
    }
  }
  const precios = d.servicios.reduce((s, c) => s + lista(c.subservicios).length, 0);
  return {
    clientes: clientes.length,
    conCelular: clientes.filter(c => c.celular).length,
    listosWhatsapp: clientes.filter(c => c.whatsapp && !c.revisar).length,
    aRevisar: clientes.filter(c => c.celular && c.revisar).length,
    dias: Object.keys(d.turnos).length,
    turnos, vino, falto, cobrado,
    categorias: d.servicios.length,
    precios,
    combos: d.combos.length,
  };
}

// ── Archivo para restaurar (se sube con "Subir archivo de otro dispositivo") ──

export function aClaves(d: DatosBackup): Record<string, unknown> {
  const claves: Record<string, unknown> = {};
  for (const [f, t] of Object.entries(d.turnos)) claves[`ganesha_turnos_${f}`] = t;
  for (const [f, g] of Object.entries(d.gastosCaja)) claves[`ganesha_gastos_${f}`] = g;
  const contactos = clientesConsolidados(d)
    .filter(c => c.celular || d.contactos.some(f => String(f.nombre ?? '').trim().toLowerCase() === c.nombre.toLowerCase()))
    .map(c => {
      const ficha = d.contactos.find(f => String(f.nombre ?? '').trim().toLowerCase() === c.nombre.toLowerCase());
      return { ...(ficha ?? { id: `bk_${c.nombre.toLowerCase().replace(/\s+/g, '_')}`, genero: 'f' }), nombre: ficha?.nombre ?? c.nombre, celular: c.celular, notas: c.notas };
    });
  if (contactos.length > 0) claves.ganesha_clientes_backup = contactos;
  if (d.borrados.length > 0) claves.ganesha_clientes_borrados = d.borrados;
  if (d.servicios.length > 0) claves.ganesha_config_servicios = d.servicios;
  if (d.combos.length > 0) claves.ganesha_catalog_combos_raw = d.combos;
  if (d.gastosEmpresa.length > 0) claves.ganesha_gastos_fijos_empresa_v2 = d.gastosEmpresa;
  if (d.gastosPersonal.length > 0) claves.ganesha_gastos_fijos_personal_v2 = d.gastosPersonal;
  return claves;
}

export function archivoRestauracion(d: DatosBackup): string {
  return JSON.stringify({
    app: 'ganesha-comando-central',
    tipo: 'backup-completo',
    version: 1,
    creado: d.generado,
    origen: d.origen,
    claves: aClaves(d),
  }, null, 2);
}

// ── Planillas para Excel (separador ; y BOM para que Excel en español abra bien) ──

function csv(filas: (string | number)[][]): string {
  const celda = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return '﻿' + filas.map(f => f.map(celda).join(';')).join('\r\n');
}
// Así Excel no convierte el número en 1,15556E+12 ni le quita el 0 inicial
const comoTexto = (s: string) => (s ? `="${s}"` : '');

const fechaAR = (f: string) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : '');

export function csvClientes(d: DatosBackup): string {
  const filas: (string | number)[][] = [['Nombre', 'Celular', 'WhatsApp', 'Revisar', 'Otros números', 'Notas', 'Turnos', 'Vino', 'Faltó', 'Primer turno', 'Último turno', 'Servicio más frecuente']];
  for (const c of clientesConsolidados(d)) {
    filas.push([c.nombre, comoTexto(c.celular), comoTexto(c.whatsapp), c.revisar, comoTexto(c.otrosNumeros.join(' / ')), c.notas,
      c.turnos, c.vino, c.falto, fechaAR(c.primerTurno), fechaAR(c.ultimoTurno), c.servicioFrecuente]);
  }
  return csv(filas);
}

const ASISTENCIA: Record<string, string> = { presente: 'Vino', no_vino: 'No vino' };
const ESTADO: Record<string, string> = { completo: 'Pagado', 'seña': 'Con seña', sin_pago: 'Sin pago' };
const PAGO: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', otro: 'Otro' };

export function csvTurnos(d: DatosBackup): string {
  const filas: (string | number)[][] = [['Fecha', 'Hora', 'Clienta', 'Servicio', 'Detalle', 'Asistencia', 'Total', 'Extra', 'Seña / cobrado', 'Saldo', 'Estado', 'Forma de pago']];
  for (const f of Object.keys(d.turnos).sort()) {
    for (const t of d.turnos[f]) {
      const total = num(t.monto_total), extra = num(t.extra), sena = num(t['seña_pagada']);
      filas.push([fechaAR(f), String(t.horario ?? ''), String(t.clienteNombre ?? ''), String(t.tratamiento ?? ''), String(t.detalle ?? ''),
        ASISTENCIA[String(t.asistencia)] ?? '', total, extra, sena, Math.max(0, total + extra - sena),
        ESTADO[String(t.estado_pago)] ?? '', PAGO[String(t.metodo_pago)] ?? String(t.metodo_pago ?? '')]);
    }
  }
  return csv(filas);
}

// ── Documento legible (se abre en cualquier navegador y se puede imprimir) ────

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
const plata = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
const diaLargo = (f: string) => new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export function documentoHtml(d: DatosBackup): string {
  const tot = totales(d);
  const clientes = clientesConsolidados(d);
  const generado = new Date(d.generado).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });

  const secClientes = clientes.map(c => `<tr><td>${esc(c.nombre)}</td><td class="mono">${esc(c.celular) || '<span class="gris">—</span>'}${c.otrosNumeros.length ? `<br><span class="gris chico">otros: ${esc(c.otrosNumeros.join(', '))}</span>` : ''}</td><td class="mono">${esc(c.whatsapp)}${c.revisar ? `<br><span class="aviso">⚠ ${esc(c.revisar)}</span>` : ''}</td><td class="n">${c.turnos}</td><td class="n">${c.vino}</td><td class="n ${c.falto ? 'rojo' : ''}">${c.falto}</td><td>${esc(fechaAR(c.ultimoTurno))}</td><td>${esc(c.servicioFrecuente)}</td><td>${esc(c.notas)}</td></tr>`).join('');

  const secServicios = d.servicios.map(cat => {
    const subs = lista(cat.subservicios);
    const jornadas = lista(cat.jornadas).sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    return `<h3>${esc(cat.icon ?? '')} ${esc(cat.nombre ?? cat.id)}${cat.activo === false ? ' <span class="gris">(inactiva)</span>' : ''}</h3>
      <table><thead><tr><th>Servicio</th><th class="n">Precio</th><th>Estado</th></tr></thead><tbody>
      ${subs.map(s => `<tr><td>${esc(s.nombre)}</td><td class="n">${plata(num(s.precio))}</td><td>${s.activo === false ? 'Inactivo' : 'Activo'}</td></tr>`).join('') || '<tr><td colspan="3" class="gris">Sin servicios</td></tr>'}
      </tbody></table>
      ${jornadas.length ? `<p class="chico"><b>Jornadas:</b> ${jornadas.map(j => `${esc(fechaAR(String(j.fecha)))} ${esc(j.hora_inicio)}–${esc(j.hora_fin)}${j.activa === false ? ' (inactiva)' : ''}`).join(' · ')}</p>` : ''}`;
  }).join('') || '<p class="gris">No hay servicios guardados.</p>';

  const secCombos = d.combos.length
    ? `<table><thead><tr><th>#</th><th>Combo</th><th>Descripción</th><th class="n">Precio</th><th>Estado</th></tr></thead><tbody>${d.combos.map(c => `<tr><td>${esc(c.numero)}</td><td>${esc(c.nombre)}</td><td>${esc(c.descripcion)}</td><td class="n">${plata(num(c.precio))}</td><td>${c.activo === false ? 'Inactivo' : 'Activo'}</td></tr>`).join('')}</tbody></table>`
    : '<p class="gris">No hay combos guardados.</p>';

  const secTurnos = Object.keys(d.turnos).sort().reverse().map(f => {
    const ts = d.turnos[f];
    const cobrado = ts.reduce((s, t) => s + num(t['seña_pagada']), 0);
    return `<h3>${esc(diaLargo(f))} <span class="gris chico">· ${ts.length} turnos · cobrado ${plata(cobrado)}${d.cajaCerrada[f] ? ' · caja cerrada' : ''}</span></h3>
      <table><thead><tr><th>Hora</th><th>Clienta</th><th>Servicio</th><th>Detalle</th><th>Asistencia</th><th class="n">Total</th><th class="n">Cobrado</th><th class="n">Saldo</th><th>Pago</th></tr></thead><tbody>
      ${ts.map(t => {
        const total = num(t.monto_total) + num(t.extra), sena = num(t['seña_pagada']);
        return `<tr><td class="mono">${esc(t.horario)}</td><td>${esc(t.clienteNombre)}</td><td>${esc(t.tratamiento)}</td><td>${esc(t.detalle)}</td><td class="${t.asistencia === 'no_vino' ? 'rojo' : ''}">${esc(ASISTENCIA[String(t.asistencia)] ?? '—')}</td><td class="n">${total ? plata(total) : ''}</td><td class="n">${sena ? plata(sena) : ''}</td><td class="n">${total - sena > 0 ? plata(total - sena) : ''}</td><td>${esc(PAGO[String(t.metodo_pago)] ?? '')}</td></tr>`;
      }).join('')}
      </tbody></table>`;
  }).join('') || '<p class="gris">No hay turnos guardados.</p>';

  const tablaGastosFijos = (titulo: string, gs: Registro[]) => `<h3>${titulo}</h3>` + (gs.length
    ? `<table><thead><tr><th>Gasto</th><th class="n">Monto</th><th>Estado</th></tr></thead><tbody>${gs.map(g => `<tr><td>${esc(g.nombre)}</td><td class="n">${plata(num(g.montoTotal ?? g.monto))}</td><td>${g.activo === false ? 'Inactivo' : 'Activo'}</td></tr>`).join('')}</tbody></table>`
    : '<p class="gris">Sin datos.</p>');
  const diasGastos = Object.keys(d.gastosCaja).sort().reverse();
  const secCaja = tablaGastosFijos('Gastos fijos de la empresa', d.gastosEmpresa) + tablaGastosFijos('Gastos fijos personales', d.gastosPersonal)
    + '<h3>Gastos cargados en la caja</h3>' + (diasGastos.length
      ? `<table><thead><tr><th>Día</th><th>Concepto</th><th class="n">Monto</th></tr></thead><tbody>${diasGastos.flatMap(f => d.gastosCaja[f].map(g => `<tr><td>${esc(fechaAR(f))}</td><td>${esc(g.concepto ?? g.nombre)}</td><td class="n">${plata(num(g.monto))}</td></tr>`)).join('')}</tbody></table>`
      : '<p class="gris">Sin gastos cargados.</p>');

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Backup Ganesha Esthetic ${esc(d.generado.slice(0, 10))}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #1f1a1e; background: #fff; margin: 0; padding: 24px; line-height: 1.45; }
  main { max-width: 1000px; margin: 0 auto; }
  h1 { font-size: 26px; margin: 0 0 4px; } h2 { font-size: 20px; margin: 36px 0 10px; border-bottom: 2px solid #8c2f5b; padding-bottom: 4px; color: #8c2f5b; }
  h3 { font-size: 15px; margin: 22px 0 6px; } p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
  th, td { text-align: left; padding: 5px 7px; border-bottom: 1px solid #e6dde1; vertical-align: top; }
  th { background: #f6eff2; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  .n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; } .mono { font-family: ui-monospace, Consolas, monospace; }
  .gris { color: #7a6e74; } .chico { font-size: 12px; } .rojo { color: #b3261e; font-weight: 600; } .aviso { color: #a8670f; font-size: 11px; font-family: system-ui, sans-serif; }
  .resumen { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 16px 0; }
  .resumen div { border: 1px solid #e6dde1; border-radius: 8px; padding: 10px 12px; } .resumen b { display: block; font-size: 22px; }
  nav a { margin-right: 14px; color: #8c2f5b; }
  @media print { body { padding: 0; } h2 { break-before: page; } tr { break-inside: avoid; } nav { display: none; } }
</style></head><body><main>
<h1>Backup Ganesha Esthetic</h1>
<p class="gris">Generado el ${esc(generado)} · Datos de: ${esc(d.origen.join(' + '))}</p>
<nav><a href="#clientes">Clientes</a><a href="#servicios">Servicios y precios</a><a href="#combos">Combos</a><a href="#turnos">Turnos</a><a href="#caja">Gastos y caja</a></nav>
<div class="resumen">
  <div><b>${tot.clientes}</b>clientes</div><div><b>${tot.conCelular}</b>con celular</div>
  <div><b>${tot.listosWhatsapp}</b>listos para WhatsApp</div><div><b>${tot.aRevisar}</b>números a revisar</div>
  <div><b>${tot.dias}</b>días con turnos</div><div><b>${tot.turnos}</b>turnos</div>
  <div><b>${tot.vino}</b>vinieron</div><div><b>${tot.falto}</b>faltaron</div>
  <div><b>${plata(tot.cobrado)}</b>cobrado</div><div><b>${tot.precios}</b>precios en ${tot.categorias} categorías</div>
</div>
<h2 id="clientes">Clientes y teléfonos (${clientes.length})</h2>
<table><thead><tr><th>Nombre</th><th>Celular</th><th>WhatsApp</th><th class="n">Turnos</th><th class="n">Vino</th><th class="n">Faltó</th><th>Último turno</th><th>Servicio frecuente</th><th>Notas</th></tr></thead><tbody>${secClientes || '<tr><td colspan="9" class="gris">Sin clientes</td></tr>'}</tbody></table>
<h2 id="servicios">Servicios, precios y jornadas</h2>${secServicios}
<h2 id="combos">Combos</h2>${secCombos}
<h2 id="turnos">Turnos (${tot.turnos} en ${tot.dias} días)</h2>${secTurnos}
<h2 id="caja">Gastos y caja</h2>${secCaja}
</main></body></html>`;
}
