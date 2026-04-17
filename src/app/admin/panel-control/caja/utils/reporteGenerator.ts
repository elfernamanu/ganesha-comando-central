import type { TurnoSecretaria, TotalesCaja } from '../hooks/useCajaDiaria';
import type { Gasto } from '../types/index';
import type { GastoFijo } from '../hooks/useGastosFijos';
import { formatearFecha, formatearHora } from './formatters';

// ─── helpers internos ────────────────────────────────────────────────────────

/** Moneda en pesos argentinos, alineada a la derecha en `ancho` caracteres */
function m(n: number, ancho = 10): string {
  const s = n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
  return s.padStart(ancho);
}

/** Trunca o rellena un string a `ancho` caracteres */
function col(s: string, ancho: number): string {
  if (!s) return ' '.repeat(ancho);
  if (s.length > ancho) return s.slice(0, ancho - 1) + '…';
  return s.padEnd(ancho);
}

const LN  = '═'.repeat(55);
const ln  = '─'.repeat(55);
const LN2 = '─'.repeat(55);

function encabezado(titulo: string) {
  return `  ${titulo}`;
}

// ─── generarReporteTxt ───────────────────────────────────────────────────────

/**
 * Genera el cierre de caja en formato .txt profesional.
 *
 * CÁLCULO CORRECTO:
 *   Total gastos  = gastos_del_día + fijos_empresa_pagados + fijos_personal_pagados
 *   Ganancia neta = ingresos – total_gastos
 */
export function generarReporteTxt(
  fecha: string,
  turnos: TurnoSecretaria[],
  gastos: Gasto[],
  totales: TotalesCaja,
  gastosEmpresa: GastoFijo[] = [],
  gastosPersonal: GastoFijo[] = [],
): string {
  // ── Fecha ──────────────────────────────────────────────────────────────────
  const fechaLabel = formatearFecha(new Date(fecha + 'T12:00:00'))
    .replace(/^\w/, c => c.toUpperCase());

  // ── Turnos ─────────────────────────────────────────────────────────────────
  const sorted = [...turnos].sort((a, b) => a.horario.localeCompare(b.horario));
  const presentes = sorted.filter(t => t.asistencia === 'presente');
  const ausentes  = sorted.filter(t => t.asistencia === 'no_vino');
  const cobradosCount = presentes.filter(t => (t.seña_pagada ?? 0) > 0).length;

  // Cabecera de tabla
  const tabTurnos = [
    `  ${'N°'.padEnd(3)} ${'HORA'.padEnd(6)} ${'CLIENTA'.padEnd(22)} ${'SERVICIO'.padEnd(22)} ${'COBRADO'.padStart(10)}  ESTADO`,
    `  ${LN2}`,
    ...sorted.map((t, i) => {
      const noVino   = t.asistencia === 'no_vino';
      const cobrado  = noVino ? 0 : (t.seña_pagada ?? 0);
      const estadoTxt =
        noVino                        ? 'No vino ✗' :
        t.estado_pago === 'completo'  ? 'Completo  ✓' :
        (t.seña_pagada ?? 0) > 0      ? 'Seña ⏳' :
                                        'Sin pago';
      return (
        `  ${String(i + 1).padStart(2)}. ` +
        `${formatearHora(t.horario).padEnd(6)} ` +
        `${col(t.clienteNombre || '—', 22)} ` +
        `${col(t.tratamiento  || '—', 22)} ` +
        `${m(cobrado)}  ${estadoTxt}`
      );
    }),
    `  ${LN2}`,
    `  Presentes: ${presentes.length}   No vinieron: ${ausentes.length}   Total: ${sorted.length}`,
  ].join('\n');

  // ── Formas de cobro ────────────────────────────────────────────────────────
  const tabCobro = [
    `  💵 Efectivo:         ${m(totales.efectivo)}`,
    `  🏦 Transferencia:    ${m(totales.transferencia)}`,
    ...(totales.otro > 0 ? [`  📱 Otro:             ${m(totales.otro)}`] : []),
  ].join('\n');

  // ── Gastos del día ─────────────────────────────────────────────────────────
  const gastosdiaTxt = gastos.length === 0
    ? '  (Sin gastos del día)'
    : gastos.map(g => `    · ${col(g.concepto, 36)} ${m(g.monto)}`).join('\n');

  // ── Gastos fijos pagados ───────────────────────────────────────────────────
  const gEmpresa  = gastosEmpresa.filter(g => g.activo);
  const gPersonal = gastosPersonal.filter(g => g.activo);

  const fijosEmpresaPagados  = gEmpresa.filter(g => g.pagado ?? false);
  const fijosPersonalPagados = gPersonal.filter(g => g.pagado ?? false);
  const fijosEmpresaPendientes  = gEmpresa.filter(g => !(g.pagado ?? false));
  const fijosPersonalPendientes = gPersonal.filter(g => !(g.pagado ?? false));

  const totalFijosEmpresaPagado  = fijosEmpresaPagados.reduce((s, g)  => s + (g.montoAcumulado ?? 0), 0);
  const totalFijosPersonalPagado = fijosPersonalPagados.reduce((s, g) => s + (g.montoAcumulado ?? 0), 0);
  const totalFijosPagados        = totalFijosEmpresaPagado + totalFijosPersonalPagado;

  const totalFijosPendiente =
    fijosEmpresaPendientes.reduce((s, g)  => s + Math.max(0, g.montoTotal - (g.montoAcumulado ?? 0)), 0) +
    fijosPersonalPendientes.reduce((s, g) => s + Math.max(0, g.montoTotal - (g.montoAcumulado ?? 0)), 0);

  // Sección fijos pagados
  const fijosPagadosTxt = ((): string => {
    const lineas: string[] = [];
    if (fijosEmpresaPagados.length > 0) {
      lineas.push('  [Empresa]');
      fijosEmpresaPagados.forEach(g =>
        lineas.push(`    ✓ ${col(g.nombre, 34)} ${m(g.montoAcumulado ?? 0)}`)
      );
    }
    if (fijosPersonalPagados.length > 0) {
      lineas.push('  [Personal — Mirian G. Francolino]');
      fijosPersonalPagados.forEach(g =>
        lineas.push(`    ✓ ${col(g.nombre, 34)} ${m(g.montoAcumulado ?? 0)}`)
      );
    }
    return lineas.length > 0 ? lineas.join('\n') : '  (Sin fijos pagados este mes)';
  })();

  // Sección fijos pendientes
  const fijosPendientesTxt = ((): string => {
    const lineas: string[] = [];
    if (fijosEmpresaPendientes.length > 0) {
      lineas.push('  [Empresa]');
      fijosEmpresaPendientes.forEach(g => {
        const pendiente = Math.max(0, g.montoTotal - (g.montoAcumulado ?? 0));
        lineas.push(`    ⏳ ${col(g.nombre, 34)} ${m(pendiente)}`);
      });
    }
    if (fijosPersonalPendientes.length > 0) {
      lineas.push('  [Personal — Mirian G. Francolino]');
      fijosPersonalPendientes.forEach(g => {
        const pendiente = Math.max(0, g.montoTotal - (g.montoAcumulado ?? 0));
        lineas.push(`    ⏳ ${col(g.nombre, 34)} ${m(pendiente)}`);
      });
    }
    return lineas.join('\n');
  })();

  // ── Números finales ────────────────────────────────────────────────────────
  // Ganancia del día = ingresos del día − gastos del día (los fijos son del MES, se muestran aparte)
  const gananciaNeta = totales.ingresos_totales - totales.gastos_totales;

  // ── Armar documento ────────────────────────────────────────────────────────
  const partes: string[] = [
    LN,
    `   GANESHA ESTHETIC — CIERRE DE CAJA`,
    `   ${fechaLabel}`,
    LN,
    '',
    encabezado('📋 DETALLE DE TURNOS'),
    tabTurnos,
    '',
    encabezado('💳 FORMAS DE COBRO'),
    `  ${ln}`,
    tabCobro,
    '',
    `${LN}`,
    encabezado('💰 RESUMEN FINANCIERO'),
    LN,
    '',
    `  INGRESOS DEL DÍA                         ${m(totales.ingresos_totales)}`,
    `  (${cobradosCount} cliente${cobradosCount !== 1 ? 's' : ''} · Ef. ${m(totales.efectivo, 0).trim()} · Tr. ${m(totales.transferencia, 0).trim()})`,
    '',
    `  GASTOS DEL DÍA:`,
    `  ${ln}`,
    gastosdiaTxt,
    `  ${ln}`,
    `  TOTAL GASTOS DEL DÍA:                ${m(-totales.gastos_totales)}`,
    '',
    `${LN}`,
    `  ${gananciaNeta >= 0 ? '✅' : '⚠️'} GANANCIA DEL DÍA:                    ${m(gananciaNeta)}`,
    `     (ingresos del día menos gastos del día)`,
    `${LN}`,
    '',
    `  GASTOS FIJOS DEL MES (referencia — no forman parte de la ganancia del día)`,
    `  ${ln}`,
    `  Ya pagados este mes:                 ${m(totalFijosPagados)}`,
    fijosPagadosTxt,
  ];

  // Fijos pendientes (bloque opcional)
  if (totalFijosPendiente > 0) {
    partes.push(
      '',
      `  Aún no pagados este mes:            ${m(totalFijosPendiente)}`,
      fijosPendientesTxt,
    );
  }

  partes.push(
    '',
    LN,
    `  Responsable: Mirian G. Francolino`,
    `  Generado:    ${fecha}`,
    LN,
    '',
  );

  return partes.join('\n');
}

// ─── descargarReporte ────────────────────────────────────────────────────────

/**
 * Descarga el reporte como archivo .txt (cliente-side, sin servidor)
 */
export function descargarReporte(contenido: string, fecha: string): void {
  try {
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href     = url;
    link.download = `GANESHA_CIERRE_${fecha}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al descargar reporte:', err);
    alert('Error al descargar el reporte. Intenta de nuevo.');
  }
}
