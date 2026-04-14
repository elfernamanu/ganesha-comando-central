import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verificarToken } from '@/lib/auth';

/**
 * GET /api/backup
 * Descarga un JSON con TODO el contenido de la base de datos.
 * Requiere token de autorización.
 * Uso: abrir en el navegador con el header o usar la herramienta de backup del Panel.
 */
export async function GET(req: NextRequest) {
  const err = verificarToken(req);
  if (err) return err;

  try {
    const [config, turnos, combos] = await Promise.all([
      query('SELECT * FROM config_servicios ORDER BY id'),
      query('SELECT fecha::text, datos, actualizado_at FROM turnos ORDER BY fecha'),
      query('SELECT * FROM combos ORDER BY id'),
    ]);

    const backup = {
      generado_at:      new Date().toISOString(),
      version:          'ganesha_backup_v1',
      config_servicios: config,
      turnos,
      combos,
    };

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type':        'application/json',
        'Content-Disposition': `attachment; filename="ganesha-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/backup]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
