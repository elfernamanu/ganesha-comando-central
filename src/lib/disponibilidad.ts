/**
 * Librería para calcular slots disponibles según configuración
 */

export interface HorarioDisponible {
  dia: string; // 'Lunes', 'Martes', etc.
  inicio: string; // '09:00'
  fin: string; // '17:00'
  activo: boolean;
}

/**
 * Calcular todos los slots disponibles para un servicio
 */
export function calcularSlotsDisponibles(
  horarios: HorarioDisponible[],
  duracionMinutos: number
): string[] {
  const slots: string[] = [];

  horarios
    .filter(h => h.activo)
    .forEach(horario => {
      const [hInicio, mInicio] = horario.inicio.split(':').map(Number);
      const [hFin, mFin] = horario.fin.split(':').map(Number);

      let minutoActual = hInicio * 60 + mInicio;
      const minutoFin = hFin * 60 + mFin;

      while (minutoActual + duracionMinutos <= minutoFin) {
        const h = Math.floor(minutoActual / 60);
        const m = minutoActual % 60;
        const slot = `${horario.dia} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        slots.push(slot);
        minutoActual += duracionMinutos;
      }
    });

  return slots;
}

/**
 * Convertir string de hora a minutos desde medianoche
 */
export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convertir minutos desde medianoche a string de hora
 */
export function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Obtener próximos slots disponibles (próximos 7 días)
 */
export function obtenerProximosSlots(
  horarios: HorarioDisponible[],
  duracionMinutos: number,
  diasAdelante: number = 7
): Map<string, string[]> {
  const hoy = new Date();
  const slots = new Map<string, string[]>();

  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  for (let i = 0; i < diasAdelante; i++) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() + i);
    const nombreDia = diasSemana[fecha.getDay()];

    const horariosDelDia = horarios.filter(h => h.dia === nombreDia && h.activo);

    const slotsDelDia: string[] = [];
    horariosDelDia.forEach(horario => {
      const [hInicio, mInicio] = horario.inicio.split(':').map(Number);
      const [hFin, mFin] = horario.fin.split(':').map(Number);

      let minutoActual = hInicio * 60 + mInicio;
      const minutoFin = hFin * 60 + mFin;

      while (minutoActual + duracionMinutos <= minutoFin) {
        const h = Math.floor(minutoActual / 60);
        const m = minutoActual % 60;
        const slot = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        slotsDelDia.push(slot);
        minutoActual += duracionMinutos;
      }
    });

    if (slotsDelDia.length > 0) {
      const fechaStr = fecha.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
      slots.set(`${nombreDia} ${fechaStr}`, slotsDelDia);
    }
  }

  return slots;
}
