/**
 * Sistema de PIN para el Panel de Control.
 *
 * ACTIVAR cuando la dueña esté lista:
 *   → Agregar en Vercel env vars:
 *        PANEL_PIN = 1234   (o el PIN que elija)
 *   → Listo. Sin tocar código.
 *
 * DESACTIVAR:
 *   → Borrar PANEL_PIN de Vercel env vars.
 *
 * El PIN se guarda en localStorage del navegador por 8 horas.
 * Después pide el PIN de nuevo automáticamente.
 */

const STORAGE_KEY  = 'ganesha_panel_auth';
const SESSION_HORAS = 8;

export interface PanelAuthState {
  autenticado: boolean;
  pinRequerido: boolean;  // false si PANEL_PIN no está configurado
}

/**
 * Verifica si el Panel requiere PIN y si ya está autenticado.
 * Solo funciona en el cliente (usa localStorage).
 */
export function verificarPanelAuth(pinServidor: string | null): PanelAuthState {
  // Sin PIN configurado → libre acceso
  if (!pinServidor) return { autenticado: true, pinRequerido: false };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { autenticado: false, pinRequerido: true };

    const { expira } = JSON.parse(stored) as { expira: number };
    if (Date.now() < expira) return { autenticado: true, pinRequerido: true };
  } catch { /* silencioso */ }

  return { autenticado: false, pinRequerido: true };
}

/**
 * Guarda la sesión autenticada por SESSION_HORAS horas.
 */
export function guardarSesionPanel(): void {
  const expira = Date.now() + SESSION_HORAS * 60 * 60 * 1000;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ expira }));
}

/**
 * Cierra la sesión del panel.
 */
export function cerrarSesionPanel(): void {
  localStorage.removeItem(STORAGE_KEY);
}
