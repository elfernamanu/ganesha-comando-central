/**
 * PIN del Panel de Control.
 * Si existe la variable de entorno PANEL_PIN en Vercel, esa gana.
 * Si no, se usa el PIN fijo definido acá.
 */
export const PANEL_PIN = process.env.PANEL_PIN || '3225';
