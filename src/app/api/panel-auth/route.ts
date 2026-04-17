import { NextRequest, NextResponse } from 'next/server';

/**
 * GET  /api/panel-auth  → { pinRequerido: bool }
 * POST /api/panel-auth  → { pin } → { ok: bool }
 */

async function sessionToken(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin + '_ganesha');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function GET() {
  const pinRequerido = !!process.env.PANEL_PIN;
  return NextResponse.json({ pinRequerido });
}

export async function POST(req: NextRequest) {
  const panelPin = process.env.PANEL_PIN;

  // Sin PIN configurado → siempre OK (sin cookie necesaria)
  if (!panelPin) return NextResponse.json({ ok: true });

  try {
    const { pin } = await req.json() as { pin: string };
    const ok = String(pin).trim() === String(panelPin).trim();

    if (!ok) return NextResponse.json({ ok: false });

    const token = await sessionToken(panelPin);
    const res = NextResponse.json({ ok: true });
    res.cookies.set('ganesha_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 horas
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
