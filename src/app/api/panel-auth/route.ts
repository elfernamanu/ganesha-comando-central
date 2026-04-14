import { NextRequest, NextResponse } from 'next/server';

/**
 * GET  /api/panel-auth  → { pinRequerido: bool }
 * POST /api/panel-auth  → { pin } → { ok: bool }
 */

export async function GET() {
  const pinRequerido = !!process.env.PANEL_PIN;
  return NextResponse.json({ pinRequerido });
}

export async function POST(req: NextRequest) {
  const panelPin = process.env.PANEL_PIN;

  // Sin PIN configurado → siempre OK
  if (!panelPin) return NextResponse.json({ ok: true });

  try {
    const { pin } = await req.json() as { pin: string };
    const ok = String(pin).trim() === String(panelPin).trim();
    return NextResponse.json({ ok });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
