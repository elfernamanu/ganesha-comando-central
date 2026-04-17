/**
 * Backend Proxy para n8n
 * - Valida token en servidor (no expuesto al cliente)
 * - Redirije a n8n sin exponer credenciales
 * - Valida origen de la solicitud
 */

import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL ?? '';
const N8N_TOKEN = process.env.N8N_TOKEN ?? '';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

export async function POST(request: NextRequest) {
  if (!N8N_WEBHOOK_URL || !N8N_TOKEN) {
    return NextResponse.json({ error: 'Webhook no configurado' }, { status: 503 });
  }

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
