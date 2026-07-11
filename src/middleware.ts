import { NextRequest, NextResponse } from 'next/server';
import { PANEL_PIN } from '@/lib/pin';

async function sessionToken(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + '_ganesha');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const expected = await sessionToken(PANEL_PIN);
  const cookie = req.cookies.get('ganesha_session')?.value;
  return cookie === expected;
}

// Rutas /admin/* que NO piden PIN:
// - login: la propia pantalla del candado
// - turnos: la secretaria trabaja acá todos los días
const RUTAS_LIBRES = ['/admin/login', '/admin/panel-control/turnos'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protege las páginas /admin/* con PIN, salvo las rutas libres.
  // Las APIs quedan libres: la agenda pública y el bot las necesitan.
  if (pathname.startsWith('/admin/') && !RUTAS_LIBRES.some(r => pathname.startsWith(r))) {
    if (await isAuthenticated(req)) return NextResponse.next();
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('from', pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*'] };
