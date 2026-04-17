/**
 * Sistema de PIN para el Panel de Control.
 *
 * ACTIVAR:   agregar PANEL_PIN en las env vars del servidor
 * DESACTIVAR: borrar PANEL_PIN
 *
 * La sesión se mantiene con una cookie httpOnly (8 horas).
 */

export async function cerrarSesionPanel(): Promise<void> {
  await fetch('/api/panel-auth', { method: 'DELETE' }).catch(() => {});
}
