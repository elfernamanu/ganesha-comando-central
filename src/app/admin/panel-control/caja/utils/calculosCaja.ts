import { Turno, Gasto, Totales } from '../types/index';

/**
 * Calcula los totales de ingresos, gastos y ganancia
 * @param turnos - Array de turnos del día
 * @param gastos - Array de gastos del día
 * @returns Objeto con ingresos, gastos y ganancia neta
 */
export function calcularTotales(turnos: Turno[], gastos: Gasto[]): Totales {
  // Sumar ingresos: solo turnos que NO fueron ausentes
  const ingresos_totales = turnos
    .filter(t => t.estado !== 'ausente')
    .reduce((sum, t) => sum + (t.monto_pagado || 0), 0);

  // Sumar gastos
  const gastos_totales = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);

  // Ganancia = ingresos - gastos
  const ganancia_neta = ingresos_totales - gastos_totales;

  return {
    ingresos_totales,
    gastos_totales,
    ganancia_neta,
  };
}

/**
 * Desglose de turno por estado
 */
export function desglosarTurnos(turnos: Turno[]) {
  return {
    sin_seña: turnos.filter(t => t.estado === 'sin_seña').length,
    seña_pagada: turnos.filter(t => t.estado === 'seña_pagada').length,
    pagado_completo: turnos.filter(t => t.estado === 'pagado_completo').length,
    ausente: turnos.filter(t => t.estado === 'ausente').length,
    total: turnos.length,
  };
}

/**
 * Calcula montos pendientes por cobrar
 */
export function calcularMontosPendientes(turnos: Turno[]): number {
  return turnos
    .filter(t => t.estado === 'seña_pagada')
    .reduce((sum, t) => sum + Math.max(0, t.monto_total - t.monto_pagado), 0);
}

/**
 * Calcula dinero en seña (depositos)
 */
export function calcularMontoSeña(turnos: Turno[]): number {
  return turnos.reduce((sum, t) => sum + (t.senia_pagada || 0), 0);
}

/**
 * Calcula dinero pagado en efectivo
 */
export function calcularEfectivoPagado(turnos: Turno[]): number {
  return turnos
    .filter(t => t.metodo_pago === 'efectivo' && t.estado !== 'ausente')
    .reduce((sum, t) => sum + (t.monto_pagado || 0), 0);
}

/**
 * Calcula dinero pagado por transferencia
 */
export function calcularTransferenciaPagada(turnos: Turno[]): number {
  return turnos
    .filter(t => t.metodo_pago === 'transferencia' && t.estado !== 'ausente')
    .reduce((sum, t) => sum + (t.monto_pagado || 0), 0);
}

/**
 * Desglose de gastos por categoría
 */
export function desglosarGastos(gastos: Gasto[]) {
  return {
    alquiler: gastos
      .filter(g => g.categoria === 'alquiler')
      .reduce((sum, g) => sum + g.monto, 0),
    servicios: gastos
      .filter(g => g.categoria === 'servicios')
      .reduce((sum, g) => sum + g.monto, 0),
    otros: gastos
      .filter(g => g.categoria === 'otros')
      .reduce((sum, g) => sum + g.monto, 0),
  };
}

/**
 * Verifica si la caja cuadra (ingresos registrados = efectivo + transferencias)
 */
export function verificarCuadreCaja(turnos: Turno[], gastos: Gasto[]): boolean {
  const { ingresos_totales } = calcularTotales(turnos, gastos);
  const efectivo = calcularEfectivoPagado(turnos);
  const transferencias = calcularTransferenciaPagada(turnos);
  const seña = calcularMontoSeña(turnos);

  return ingresos_totales === efectivo + transferencias + seña;
}
