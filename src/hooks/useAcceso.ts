'use client';

/**
 * Acceso temporalmente abierto — siempre devuelve true.
 * Restaurar cuando se reactive el sistema de dispositivos.
 */
export function useAcceso(): boolean | null {
  return true;
}
