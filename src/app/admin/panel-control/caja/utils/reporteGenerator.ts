import { CajaDiaria, Totales } from '../types/index';
import { formatearDinero, formatearFecha, formatearHora, formatearNombre, formatearConcepto } from './formatters';
import { desglosarGastos, desglosarTurnos } from './calculosCaja';

/**
 * Genera el contenido del reporte en formato texto
 */
export function generarReporteTxt(caja: CajaDiaria, totales: Totales): string {
  const fecha = formatearFecha(new Date(caja.fecha + 'T00:00:00'));
  const desgloseTurnos = desglosarTurnos(caja.turnos);
  const desglose = desglosarGastos(caja.gastos);

  const linea = '═══════════════════════════════════════════════════';
  const sublinea = '───────────────────────────────────────────────────';

  // Sección de turnos
  const turnosList = caja.turnos
    .map((t, i) => {
      const serviciosText = t.servicios.join(' + ');
      const estadoIcon =
        t.estado === 'pagado_completo' ? '✓' : t.estado === 'ausente' ? '✗' : '⏳';

      return `
${i + 1}. ${formatearNombre(t.clienteNombre)}
   Hora: ${formatearHora(t.horario)}
   Servicios: ${serviciosText}
   Monto total: ${formatearDinero(t.monto_total)}
   Seña requerida: ${formatearDinero(t.senia_requerida)}
   Seña pagada: ${formatearDinero(t.senia_pagada)}
   Monto cobrado: ${formatearDinero(t.monto_pagado)}
   Estado: ${estadoIcon} ${t.estado === 'sin_seña' ? 'Sin seña' : t.estado === 'seña_pagada' ? 'Seña pagada' : t.estado === 'pagado_completo' ? 'Pagado' : 'No vino'}`;
    })
    .join('\n');

  // Sección de gastos
  const gastosList = caja.gastos
    .map((g, i) => `${i + 1}. ${formatearConcepto(g.concepto)}: ${formatearDinero(g.monto)}`)
    .join('\n');

  return `
${linea}
    GANESHA ESTHETIC - CIERRE DE CAJA
    ${fecha}
${linea}

📋 TURNOS DEL DÍA (${desgloseTurnos.total} clientes)
${sublinea}
${turnosList}

${sublinea}
Resumen por estado:
• Pagado completo: ${desgloseTurnos.pagado_completo}
• Seña pagada: ${desgloseTurnos.seña_pagada}
• Sin seña: ${desgloseTurnos.sin_seña}
• No vinieron: ${desgloseTurnos.ausente}

💰 GASTOS DEL DÍA
${sublinea}
${gastosList || '(Sin gastos registrados)'}

${sublinea}
Desglose de gastos:
• Alquiler: ${formatearDinero(desglose.alquiler)}
• Servicios: ${formatearDinero(desglose.servicios)}
• Otros: ${formatearDinero(desglose.otros)}

${linea}
📊 RESUMEN FINANCIERO
${sublinea}
INGRESOS:           ${formatearDinero(totales.ingresos_totales)}
GASTOS:             ${formatearDinero(totales.gastos_totales)}
${sublinea}
GANANCIA NETA:      ${formatearDinero(totales.ganancia_neta)} ✓
${linea}
`;
}

/**
 * Descarga el reporte como archivo .txt
 * Se ejecuta en el navegador (cliente-side)
 */
export function descargarReporte(contenido: string, fecha: string): void {
  try {
    // Crear blob de texto
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });

    // Crear URL temporal
    const url = URL.createObjectURL(blob);

    // Crear link temporal
    const link = document.createElement('a');
    link.href = url;
    link.download = `GANESHA_CIERRE_${fecha}.txt`;

    // Agregar al DOM, clickear, y remover
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Liberar memoria
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error al descargar reporte:', error);
    alert('Error al descargar el reporte. Intenta de nuevo.');
  }
}

/**
 * Genera y descarga el reporte en una sola función
 */
export function generarYDescargarReporte(caja: CajaDiaria, totales: Totales): void {
  const contenido = generarReporteTxt(caja, totales);
  descargarReporte(contenido, caja.fecha);
}
