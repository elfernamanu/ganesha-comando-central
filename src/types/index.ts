/**
 * TypeScript Types para Ganesha Esthetic
 */

// Servicios (Los 4 Boxes)
export interface Servicio {
  id: number;
  nombre: 'Depilación' | 'Uñas' | 'Estética Corporal' | 'Pestañas';
  duracion_minutos: number;
  precio: number;
  color: 'slate' | 'rose' | 'emerald' | 'purple';
}

// Clientes
export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  fecha_registro: string;
}

// Turnos (Citas)
export interface Turno {
  id: number;
  cliente_id: number | null;
  servicio_id: number;
  fecha_hora: string;
  estado: 'Pendiente' | 'Confirmado' | 'Completado' | 'Cancelado';
  seña_pagada: number;
  // Joined data
  cliente?: {
    nombre: string;
    telefono: string;
  };
  servicio?: Servicio;
}

// Movimiento contable
export interface MovimientoContable {
  id: number;
  fecha_hora: string;
  concepto: string;
  tipo_movimiento: 'INGRESO' | 'EGRESO';
  monto: number;
  turno_id?: number;
}

// Payload para crear turno
export interface CrearTurnoPayload {
  cliente_nombre: string;
  cliente_telefono: string;
  servicio_id: number;
  fecha_hora: string;
}

// Respuesta de n8n
export interface N8nResponse {
  status: string;
  bunker_status: string;
  last_update: string;
  data: any;
  count: number;
}

// Error response
export interface ErrorResponse {
  error: string;
  mensaje?: string;
}
