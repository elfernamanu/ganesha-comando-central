/**
 * Backend Proxy para n8n
 * - Valida token en servidor (no expuesto al cliente)
 * - Redirije a n8n sin exponer credenciales
 * - Valida origen de la solicitud
 */

import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = 'http://164.90.194.79:5678/webhook/api/v1/bunker-ganesha';
const N8N_TOKEN = 'Ganesha_Admin_2026_Secure';
const ALLOWED_ORIGINS = [
  'https://ganesha-comando-central.vercel.app',
  'http://localhost:3000',
];

export async function POST(request: NextRequest) {
  try {
    // 1. Validar origen (CORS básico)
    const origin = request.headers.get('origin');
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return NextResponse.json(
        { error: 'Acceso denegado: origen no permitido' },
        { status: 403 }
      );
    }

    // 2. Leer body
    const body = await request.json();

    // 3. Redirijo a n8n CON token en servidor (no exponerlo al cliente)
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ganesha-token': N8N_TOKEN,
      },
      body: JSON.stringify(body),
    });

    // 4. Procesar respuesta
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Error en n8n' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('[WEBHOOK ERROR]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Manejar OPTIONS para CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
