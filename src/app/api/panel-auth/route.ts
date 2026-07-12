import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { PANEL_PIN } from '@/lib/pin';

/**
 * GET    /api/panel-auth  → { pinRequerido: bool }
 * POST   /api/panel-auth  → { pin } → { ok: bool }  + setea cookie de sesión
 * DELETE /api/panel-auth  → cierra sesión (borra cookie)
 */

async function sessionToken(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + '_ganesha');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function GET() {
  // Candado desactivado — la página de login redirige directo sin pedir PIN
  return NextResponse.json({ pinRequerido: false });
}

export async function POST(req: NextRequest) {
  const panelPin = PANEL_PIN;

  try {
    const body = await req.json() as { pin?: string; deviceId?: string };

    // Dispositivo registrado → bypass del PIN
    if (body.deviceId && !body.pin) {
      const rows = await query(
        'SELECT id FROM dispositivos WHERE id = $1 AND registrado = true',
        [body.deviceId]
      );
      if (rows.length > 0) {
        const token = await sessionToken(panelPin);
        const res = NextResponse.json({ ok: true });
        res.cookies.set('ganesha_session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60,
          path: '/',
        });
        return res;
      }
      return NextResponse.json({ ok: false });
    }

    const ok = String(body.pin ?? '').trim() === String(panelPin).trim();
    if (!ok) return NextResponse.json({ ok: false });

    const token = await sessionToken(panelPin);
    const res = NextResponse.json({ ok: true });
    res.cookies.set('ganesha_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 días — el PIN se pide una vez por dispositivo
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('ganesha_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
  return res;
}
