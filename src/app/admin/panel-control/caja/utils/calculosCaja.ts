import { Gasto } from '../types/index';

/**
 * Desglose de gastos por categoría
 * Usado por GastosList para mostrar subtotales
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
