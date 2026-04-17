import { NextRequest, NextResponse } from 'next/server';

// Rutas de API que NO requieren sesión
const PUBLIC_API = ['/api/panel-auth', '/api/health'];

async function sessionToken(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + '_ganesha');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const pin = process.env.PANEL_PIN;
  if (!pin) return true; // sin PIN → libre acceso
  const expected = await sessionToken(pin);
  const cookie = req.cookies.get('ganesha_session')?.value;
  return cookie === expected;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Rutas /api/* ──────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    if (PUBLIC_API.some(p => pathname.startsWith(p))) return NextResponse.next();
    if (await isAuthenticated(req)) return NextResponse.next();
    return NextResponse.json({ ok: false, error: 'Sesión inválida' }, { status: 401 });
  }

  // ── Rutas /admin/* (excepto la propia página de login) ───────────────────
  if (pathname.startsWith('/admin/') && !pathname.startsWith('/admin/login')) {
    if (await isAuthenticated(req)) return NextResponse.next();
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('from', pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/api/:path*', '/admin/:path*'] };
