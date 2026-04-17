import { NextRequest, NextResponse } from 'next/server';

// Rutas de API que NO requieren sesión
const PUBLIC_API = ['/api/panel-auth', '/api/health', '/api/webhook'];

async function sessionToken(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + '_ganesha');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/api/')) return NextResponse.next();
  if (PUBLIC_API.some(p => pathname.startsWith(p))) return NextResponse.next();

  const pin = process.env.PANEL_PIN;
  if (!pin) return NextResponse.next(); // sin PIN → acceso libre (backwards compat)

  const expected = await sessionToken(pin);
  const cookie = req.cookies.get('ganesha_session')?.value;

  if (cookie === expected) return NextResponse.next();

  return NextResponse.json({ ok: false, error: 'Sesión inválida' }, { status: 401 });
}

export const config = { matcher: '/api/:path*' };
