import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarToken } from '@/lib/auth';
import { guardarBackup } from '@/lib/backup';

// GET /api/turnos?fecha=2026-04-15
export async function GET(req: NextRequest) {
  const err = verificarToken(req);
  if (err) return err;
  const fecha = req.nextUrl.searchParams.get('fecha');
  if (!fecha) return NextResponse.json({ ok: false, datos: [] }, { status: 400 });

  try {
    const rows = await query<{ datos: unknown }>(
      'SELECT datos FROM turnos WHERE fecha = $1',
      [fecha]
    );
    return NextResponse.json({ ok: true, datos: rows[0]?.datos ?? [] });
  } catch (err) {
    console.error('[GET /api/turnos]', err);
    return NextResponse.json({ ok: false, datos: [] }, { status: 500 });
  }
}

// POST /api/turnos → { fecha, datos, forzar? }
export async function POST(req: NextRequest) {
  const err = verificarToken(req);
  if (err) return err;
  try {
    const body = await req.json();
    const { fecha, datos, forzar } = body;
    if (!fecha || !Array.isArray(datos)) return NextResponse.json({ ok: false }, { status: 400 });

    // Misma protección que /api/sync: rechazar vacíos y parciales sin forzar:true
    if (!forzar) {
      const existing = await query<{ cant: string }>(
        `SELECT jsonb_array_length(datos)::text AS cant FROM turnos WHERE fecha = $1`,
        [fecha]
      );
      const cantExistente = parseInt(existing[0]?.cant ?? '0', 10);
      if (cantExistente > 0 && datos.length === 0) {
        return NextResponse.json({
          ok: false, protegido: true,
          error: `Protección activa: hay ${cantExistente} turno${cantExistente !== 1 ? 's' : ''} para ${fecha}. No se puede guardar vacío.`,
        }, { status: 409 });
      }
      if (cantExistente > datos.length && datos.length > 0) {
        return NextResponse.json({
          ok: false, protegido: true, parcial: true,
          cantServidor: cantExistente, cantEnviados: datos.length,
          error: `Protección activa: el servidor tiene ${cantExistente} turnos para ${fecha} pero se enviaron solo ${datos.length}.`,
        }, { status: 409 });
      }
    }

    // Backup antes de sobreescribir
    const current = await query<{ datos: unknown }>('SELECT datos FROM turnos WHERE fecha = $1', [fecha]).catch(() => []);
    if ((current as { datos: unknown }[])[0]?.datos) await guardarBackup('turnos', fecha, (current as { datos: unknown }[])[0].datos);

    await query(
      `INSERT INTO turnos (fecha, datos, actualizado_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (fecha) DO UPDATE
         SET datos = EXCLUDED.datos,
             actualizado_at = NOW()`,
      [fecha, JSON.stringify(datos)]
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[POST /api/turnos]', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
