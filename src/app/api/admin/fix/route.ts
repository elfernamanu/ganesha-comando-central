import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * GET /api/admin/fix
 * Limpia datos basura y activa jornadas hardcodeadas.
 * Usar una sola vez para arreglar el estado del servidor.
 */
export async function GET() {
  try {
    const rows = await query<{ datos: unknown }>('SELECT datos FROM config_servicios WHERE id = 1');
    if (!rows[0]) return NextResponse.json({ ok: false, error: 'Sin datos' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const datos: any[] = rows[0].datos as any[];

    // Jornadas correctas para cada categoría
    const jornadasPorCategoria: Record<string, { id: string; fecha: string; hora_inicio: string; hora_fin: string; activa: boolean }[]> = {
      unas:       [{ id: 'jornada_unas_1',    fecha: '2026-04-24', hora_inicio: '08:00', hora_fin: '20:00', activa: true }],
      depilacion: [{ id: 'jornada_depi_1',    fecha: '2026-04-18', hora_inicio: '08:00', hora_fin: '20:00', activa: true }],
      estetica:   [{ id: 'jornada_est_1',     fecha: '2026-04-20', hora_inicio: '08:00', hora_fin: '20:00', activa: true }],
      pestanas:   [{ id: 'jornada_pest_1',    fecha: '2026-04-25', hora_inicio: '08:00', hora_fin: '20:00', activa: true }],
    };

    // Nombres correctos para PROMO UÑAS 1 (se perdió)
    const nombresFix: Record<string, Record<number, string>> = {
      unas: { 9: 'PROMO UÑAS 1: Semi + Belleza de Manos' },
    };

    const datosLimpios = datos.map((cat: any) => {
      // Limpiar subservicios: sacar items con nombre vacío o "Nuevo"
      const subservicios = (cat.subservicios || []).filter(
        (s: any) => s.nombre && s.nombre.trim() !== '' && !s.nombre.includes('Nuevo')
      ).map((s: any) => {
        // Fix nombres perdidos
        const fixNombre = nombresFix[cat.id]?.[s.id];
        return fixNombre ? { ...s, nombre: fixNombre } : s;
      });

      return {
        ...cat,
        jornadas: jornadasPorCategoria[cat.id] ?? cat.jornadas ?? [],
        subservicios,
      };
    });

    await query(
      `INSERT INTO config_servicios (id, datos, actualizado_at)
       VALUES (1, $1::jsonb, NOW())
       ON CONFLICT (id)
       DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = EXCLUDED.actualizado_at`,
      [JSON.stringify(datosLimpios)]
    );

    return NextResponse.json({ ok: true, mensaje: 'Datos arreglados', categorias: datosLimpios.map((c: any) => ({ id: c.id, jornadas: c.jornadas.length, subservicios: c.subservicios.length })) });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
