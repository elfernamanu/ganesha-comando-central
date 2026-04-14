import { NextRequest, NextResponse } from 'next/server';

/**
 * Valida que el request traiga el token secreto de Ganesha.
 * El token se pasa como header: Authorization: Bearer <token>
 * La variable de entorno API_SECRET se configura en Vercel.
 */
export function verificarToken(req: NextRequest): NextResponse | null {
  const secret = process.env.API_SECRET;

  // Si no está configurado el secret (dev local sin .env.local) → permitir
  if (!secret) return null;

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (token !== secret) {
    return NextResponse.json(
      { ok: false, error: 'No autorizado' },
      { status: 401 }
    );
  }

  return null; // null = OK, continuar
}
