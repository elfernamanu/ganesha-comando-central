// Tipo de movimiento en caja
export type TipoMovimiento = 'seña' | 'cobro' | 'ganancia_extra';

// Método de pago
export type MetodoPago = 'efectivo' | 'transferencia' | 'otro';

/**
 * MOVIMIENTO CAJA - Un registro en la caja diaria
 */
export interface MovimientoCaja {
  id: string;
  clienteNombre: string;
  tipo: TipoMovimiento;                // seña | cobro | ganancia_extra
  descripcion: string;                 // "Depilación PROMO 1" o "Ganancia: Uñas"
  monto: number;                       // $ 120.000
  metodo_pago: MetodoPago;
  timestamp: number;
  turnoId?: string;                    // Link al turno si aplica
}

/**
 * RESUMEN CAJA - Totales del día
 */
export interface ResumenCaja {
  fecha: string;                       // "2026-04-13"
  movimientos: MovimientoCaja[];
  total_ingresos: number;
  total_gastos: number;                // (si aplica)
  ganancia_neta: number;
}
