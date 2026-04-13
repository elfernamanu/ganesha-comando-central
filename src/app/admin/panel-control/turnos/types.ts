// Estado de asistencia
export type Asistencia = 'presente' | 'no_vino';

// Estado de pago
export type EstadoPago = 'sin_pago' | 'seña' | 'completo';

// Método de pago
export type MetodoPago = 'efectivo' | 'transferencia' | 'otro';

// Tratamiento disponible
export type Tratamiento = 'Depilación PROMO 1' | 'Depilación PROMO 2' | 'Depilación PROMO 3' | 'Depilación PROMO 4' | 'Uñas' | 'Estética' | 'Pestañas' | 'Otro';

/**
 * TURNO - Registro de turnos del día
 * Una fila en la tabla de Turnos
 */
export interface Turno {
  id: string;
  horario: string;                    // "09:00"
  clienteNombre: string;              // "Mariana López"
  tratamiento: Tratamiento;           // "Depilación PROMO 1" (promo/combo)
  detalle: string;                    // "Cuerpo completo sin rostro" (qué se hace)

  asistencia: Asistencia;             // "presente" | "no_vino"

  // Financiero
  monto_total: number;                // $33.000
  seña_pagada: number;                // $5.000
  estado_pago: EstadoPago;            // "sin_pago" | "seña" | "completo"
  metodo_pago: MetodoPago;            // "efectivo"

  // Metadata
  notas?: string;
  createdAt: number;
}

/**
 * MOVIMIENTO CAJA - Para el control financiero
 * Se genera a partir de los Turnos
 */
export interface MovimientoCaja {
  id: string;
  turnoId: string;
  clienteNombre: string;
  tratamiento: Tratamiento;
  monto: number;                      // Monto cobrado (seña o total)
  tipo: 'seña' | 'cobro' | 'ganancia_extra';
  metodo_pago: MetodoPago;
  timestamp: number;
}

// Props para componentes
export interface TurnosTableProps {
  turnos: Turno[];
  onActualizar: (id: string, cambios: Partial<Turno>) => void;
  onEliminar: (id: string) => void;
  onAgregar: () => void;
}
