/**
 * FUENTE ÚNICA DE VERDAD — Tipo Turno
 *
 * Importado por:
 *   - turnos/types.ts      (la secretaria carga turnos)
 *   - caja/hooks/useCajaDiaria.ts  (la dueña cierra la caja)
 *   - caja/utils/reporteGenerator.ts
 *
 * Regla: si necesitás cambiar la estructura del turno, cambiá SOLO este archivo.
 */

export type Asistencia  = 'presente' | 'no_vino' | '';
export type EstadoPago  = 'sin_pago' | 'seña' | 'completo';
export type MetodoPago  = 'efectivo' | 'transferencia' | 'otro';

export interface Turno {
  id: string;
  horario: string;           // "09:00"
  clienteNombre: string;     // "Mariana López"
  tratamiento: string;       // libre — viene del catálogo dinámico (sin emojis)
  detalle: string;           // "Cuerpo completo sin rostro"
  asistencia: Asistencia;
  monto_total: number;       // $ 33.000
  seña_pagada: number;       // $ 5.000
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago;
  notas?: string;
  createdAt: number;
}
