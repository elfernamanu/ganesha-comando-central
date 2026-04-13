// Estado del turno (workflow de pago)
export type EstadoTurno = 'sin_seña' | 'seña_pagada' | 'pagado_completo' | 'ausente';

// Método de pago
export type MetodoPago = 'efectivo' | 'transferencia' | 'otro';

// Categoría de gasto
export type CategoriaGasto = 'alquiler' | 'servicios' | 'otros';

// ============================================
// TURNO - Representa un cliente + servicios
// ============================================
export interface Turno {
  id: string;                    // Identificador único (timestamp o uuid)
  clienteNombre: string;         // "Mariana López"
  servicios: string[];           // ["Depilación PROMO 1", "Uñas"]
  monto_total: number;           // Precio total del servicio ($33.000)
  senia_requerida: number;       // Monto que debe pagar como seña ($5.000)
  estado: EstadoTurno;           // Estado actual del pago
  senia_pagada: number;          // Monto que pagó de seña ($5.000 o menos)
  monto_pagado: number;          // Monto total pagado (puede ser > monto_total)
  metodo_pago: MetodoPago;       // Cómo pagó
  horario: string;               // "14:30"
  notas?: string;                // Notas opcionales
  createdAt: number;             // Timestamp de creación
}

// ============================================
// GASTO - Registro de gastos del día
// ============================================
export interface Gasto {
  id: string;                    // Identificador único
  concepto: string;              // "Alquiler del local", "Luz", etc.
  monto: number;                 // Cantidad gastada
  categoria: CategoriaGasto;     // Categoría para agrupar
  notas?: string;                // Detalles opcionales
  timestamp: number;             // Timestamp de creación
}

// ============================================
// CAJA DIARIA - Estado general de la caja
// ============================================
export interface CajaDiaria {
  fecha: string;                 // "2026-04-13"
  turnos: Turno[];               // Todos los turnos del día
  gastos: Gasto[];               // Todos los gastos del día
  estado: 'abierta' | 'cerrada'; // Estado de la caja
  createdAt?: number;            // Timestamp de creación
}

// ============================================
// TOTALES - Cálculos derivados (no persistir)
// ============================================
export interface Totales {
  ingresos_totales: number;      // Suma de montos_pagados
  gastos_totales: number;        // Suma de gastos
  ganancia_neta: number;         // ingresos - gastos
}

// ============================================
// PROPS DE COMPONENTES
// ============================================
export interface TurnoCardProps {
  turno: Turno;
  onActualizar: (id: string, cambios: Partial<Turno>) => void;
  onEliminar?: (id: string) => void;
}

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

export interface CierreDiaSectionProps {
  caja: CajaDiaria;
  totales: Totales;
  onDescargar: () => void;
  onCerrar: () => void;
}
