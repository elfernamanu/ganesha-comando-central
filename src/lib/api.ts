/**
 * API Client para comunicarse con n8n vía Backend Proxy
 */

import type { N8nResponse, ErrorResponse, CrearTurnoPayload } from '@/types';

const API_BASE = '/api';

/**
 * Llamar webhook de n8n a través del backend proxy
 */
async function callWebhook(payload: any): Promise<N8nResponse | ErrorResponse> {
  try {
    const response = await fetch(`${API_BASE}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error en webhook');
    }

    return data as N8nResponse;
  } catch (error) {
    console.error('[API ERROR]', error);
    throw error;
  }
}

/**
 * Obtener turnos del día actual
 */
export async function obtenerTurnosHoy(): Promise<N8nResponse | null> {
  try {
    const response = await callWebhook({
      action: 'obtenerTurnos',
      fecha: new Date().toISOString(),
    });
    return response as N8nResponse;
  } catch (error) {
    console.error('[OBTENER TURNOS ERROR]', error);
    return null;
  }
}

/**
 * Crear nuevo turno
 */
export async function crearTurno(payload: CrearTurnoPayload): Promise<N8nResponse | null> {
  try {
    const response = await callWebhook({
      action: 'crearTurno',
      cliente_nombre: payload.cliente_nombre,
      cliente_telefono: payload.cliente_telefono,
      servicio_id: payload.servicio_id,
      fecha_hora: payload.fecha_hora,
    });
    return response as N8nResponse;
  } catch (error) {
    console.error('[CREAR TURNO ERROR]', error);
    return null;
  }
}

/**
 * Obtener datos de servicios (4 boxes)
 */
export async function obtenerServicios(): Promise<any> {
  try {
    const response = await callWebhook({
      action: 'obtenerServicios',
    });
    return response;
  } catch (error) {
    console.error('[OBTENER SERVICIOS ERROR]', error);
    return null;
  }
}

/**
 * Cancelar turno
 */
export async function cancelarTurno(turnoId: number): Promise<N8nResponse | null> {
  try {
    const response = await callWebhook({
      action: 'cancelarTurno',
      turno_id: turnoId,
    });
    return response as N8nResponse;
  } catch (error) {
    console.error('[CANCELAR TURNO ERROR]', error);
    return null;
  }
}
