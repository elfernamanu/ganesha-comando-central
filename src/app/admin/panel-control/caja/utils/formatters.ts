/**
 * Formatea un número como dinero en pesos argentinos
 * @example formatearDinero(33000) → "$33.000"
 */
export function formatearDinero(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) return '$0';

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Formatea una fecha como string legible en español
 * @example formatearFecha(new Date('2026-04-13')) → "lunes, 13 de abril de 2026"
 */
export function formatearFecha(date: Date): string {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

/**
 * Formatea una hora en formato HH:MM
 * @example formatearHora('14:30') → "14:30"
 */
export function formatearHora(time: string): string {
  if (!time) return '--:--';
  const [horas, minutos] = time.split(':');
  return `${horas || '00'}:${minutos || '00'}`;
}

/**
 * Convierte una fecha ISO (2026-04-13) a objeto Date
 */
export function parsearFechaISO(fecha: string): Date {
  const [year, month, day] = fecha.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Formatea un nombre (capitaliza primera letra)
 */
export function formatearNombre(nombre: string): string {
  if (!nombre) return '';
  return nombre
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Formatea un concepto de gasto
 */
export function formatearConcepto(concepto: string): string {
  return concepto.charAt(0).toUpperCase() + concepto.slice(1);
}
