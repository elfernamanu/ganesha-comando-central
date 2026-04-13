// Método de pago
export type MetodoPago = 'efectivo' | 'transferencia' | 'otro';

// Categoría de gasto
export type CategoriaGasto = 'alquiler' | 'servicios' | 'otros';

// ============================================
// GASTO - Registro de gastos del día
// ============================================
export interface Gasto {
  id: string;
  concepto: string;
  monto: number;
  categoria: CategoriaGasto;
  notas?: string;
  timestamp: number;
}

// ============================================
// PROPS DE COMPONENTES
// ============================================
export interface GastosFormProps {
  onAgregar: (gasto: Omit<Gasto, 'id' | 'timestamp'>) => void;
}

export interface GastosListProps {
  gastos: Gasto[];
  onEliminar: (id: string) => void;
}

export interface EstadisticasProps {
  ingresos: number;
  gastos: number;
  ganancia: number;
}
