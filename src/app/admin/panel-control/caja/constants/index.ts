// Categorías de gastos con emojis
export const CATEGORIAS_GASTO = [
  { value: 'alquiler', label: '🏪 Alquiler del local' },
  { value: 'servicios', label: '⚡ Servicios (Luz, Agua, Internet)' },
  { value: 'otros', label: '📦 Otros gastos' }
] as const;

// Métodos de pago
export const METODOS_PAGO = [
  { value: 'efectivo', label: '💵 Efectivo' },
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'otro', label: '📱 Otro' }
] as const;

// Estados de turno con información visual
export const ESTADOS_TURNO = [
  { value: 'sin_seña', label: 'Sin seña', icon: '⭕', color: 'gray' },
  { value: 'seña_pagada', label: '⏳ Seña pagada', icon: '⏳', color: 'yellow' },
  { value: 'pagado_completo', label: '✓ Pagado completo', icon: '✓', color: 'green' },
  { value: 'ausente', label: '✗ No vino', icon: '✗', color: 'red' }
] as const;

// Porcentaje default de seña (% del total)
export const PORCENTAJE_SENIA_DEFAULT = 0.15; // 15%

// Montos mínimos
export const MONTO_MINIMO_GASTO = 100; // $100
