import type { TurnoSecretaria, TotalesCaja } from '../hooks/useCajaDiaria';
import type { Gasto } from '../types/index';
import type { GastoFijo } from '../hooks/useGastosFijos';
import { formatearDinero, formatearFecha, formatearHora } from './formatters';
import { desglosarGastos } from './calculosCaja';

/**
 * Genera el contenido del reporte en formato texto
 * Trabaja con los datos tal como los guarda la secretaria
 */
export function generarReporteTxt(
  fecha: string,
  turnos: TurnoSecretaria[],
  gastos: Gasto[],
  totales: TotalesCaja,
  gastosEmpresa?: GastoFijo[],
  gastosPersonal?: GastoFijo[]
): string {
  const fechaFormateada = formatearFecha(new Date(fecha + 'T00:00:00'));
  const desglose = desglosarGastos(gastos);

  const linea  = '═══════════════════════════════════════════════════';
  const sublin = '───────────────────────────────────────────────────';

  // Lista de turnos
  const turnosTxt = turnos.length === 0
    ? '   (Sin turnos registrados)'
    : turnos
        .sort((a, b) => a.horario.localeCompare(b.horario))
        .map((t, i) => {
          const asistIcon = t.asistencia === 'presente' ? '✓' : '✗';
          const estadoTxt =
            t.estado_pago === 'completo' ? 'Pagado completo' :
            t.estado_pago === 'seña'     ? 'Seña pagada'     :
                                           'Sin pago';
          const detalleTxt = t.detalle ? ` — ${t.detalle}` : '';

          return [
            `${i + 1}. ${t.clienteNombre} (${formatearHora(t.horario)}) ${asistIcon}`,
            `   Servicio: ${t.tratamiento}${detalleTxt}`,
            `   Total: ${formatearDinero(t.monto_total)} | Seña cobrada: ${formatearDinero(t.seña_pagada)}`,
            `   Estado pago: ${estadoTxt} | Método: ${t.metodo_pago}`,
          ].join('\n');
        })
        .join('\n\n');

  // Lista de gastos
  const gastosTxt = gastos.length === 0
    ? '   (Sin gastos registrados)'
    : gastos
        .map((g, i) => `${i + 1}. ${g.concepto}: ${formatearDinero(g.monto)}`)
        .join('\n');

  // Secciones de gastos fijos (opcionales)
  const seccionEmpresa = gastosEmpresa && gastosEmpresa.length > 0
    ? [
        '',
        `${linea}`,
        '💼 GASTOS EMPRESA (FIJOS)',
        sublin,
        ...gastosEmpresa.map(g => {
          const pagado = g.pagado ?? false;
          const acum   = g.montoAcumulado ?? 0;
          const estado = pagado
            ? '✓ PAGADO'
            : `${formatearDinero(acum)} pagado / ${formatearDinero(g.montoTotal)} total`;
          return `  ${g.nombre}: ${estado}`;
        }),
      ].join('\n')
    : '';

  const seccionPersonal = gastosPersonal && gastosPersonal.length > 0
    ? [
        '',
        '🏠 GASTOS PERSONALES — Mirian G. Francolino',
        sublin,
        ...gastosPersonal.map(g => {
          const pagado = g.pagado ?? false;
          const acum   = g.montoAcumulado ?? 0;
          const estado = pagado
            ? '✓ PAGADO'
            : `${formatearDinero(acum)} pagado / ${formatearDinero(g.montoTotal)} total`;
          return `  ${g.nombre}: ${estado}`;
        }),
        linea,
      ].join('\n')
    : '';

  return `
${linea}
   GANESHA ESTHETIC — CIERRE DE CAJA
   ${fechaFormateada}
${linea}

📋 TURNOS DEL DÍA
${sublin}
${turnosTxt}

${sublin}
Resumen de asistencia:
  Presentes:  ${totales.turnos_presentes}
  No vinieron: ${totales.turnos_ausentes}
  Total:       ${totales.turnos_total}

💸 GASTOS DEL DÍA
${sublin}
${gastosTxt}

${sublin}
Desglose de gastos:
  Alquiler:  ${formatearDinero(desglose.alquiler)}
  Servicios: ${formatearDinero(desglose.servicios)}
  Otros:     ${formatearDinero(desglose.otros)}
${seccionEmpresa}${seccionPersonal}

${linea}
📊 RESUMEN FINANCIERO
${sublin}
INGRESOS:      ${formatearDinero(totales.ingresos_totales)}
GASTOS:        ${formatearDinero(totales.gastos_totales)}
${sublin}
GANANCIA NETA: ${formatearDinero(totales.ganancia_neta)}  ${totales.ganancia_neta >= 0 ? '✓' : '⚠'}
${linea}
`.trimStart();
}

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
