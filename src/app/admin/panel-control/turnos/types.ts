// Re-exporta tipos compartidos desde fuente única
export type { Turno, Asistencia, EstadoPago, MetodoPago } from '../_shared/turnoType';

import type { Turno, MetodoPago } from '../_shared/turnoType';

/**
 * MOVIMIENTO CAJA - Para el control financiero
 * Se genera a partir de los Turnos
 */
export interface MovimientoCaja {
  id: string;
  turnoId: string;
  clienteNombre: string;
  tratamiento: string;
  monto: number;
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
  celularesSync?: Set<string>; // clienteNombre lowercase con celular confirmado guardado
}
