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

    // Promos que deben existir si no están
    const promosRequeridas: Record<string, { id: number; nombre: string; precio: number }[]> = {
      unas: [
        { id: 9,  nombre: 'PROMO UNAS 1: Semi + Belleza de Manos',   precio: 28000 },
        { id: 10, nombre: 'PROMO UNAS 2: Capping + Belleza de Pies', precio: 38000 },
        { id: 11, nombre: 'PROMO UNAS 3: Semi Manos + Pies',         precio: 35000 },
      ],
    };

    const datosLimpios = datos.map((cat: any) => {
      // 1. Aplicar fix de nombres primero
      const subsFix = (cat.subservicios || []).map((s: any) => {
        const fixNombre = nombresFix[cat.id]?.[s.id];
        return fixNombre ? { ...s, nombre: fixNombre } : s;
      });

      // 2. Sacar items basura (nombre vacío o "Nuevo")
      const subsFiltrados = subsFix.filter(
        (s: any) => s.nombre && s.nombre.trim() !== '' && !s.nombre.includes('Nuevo')
      );

      // 3. Agregar promos requeridas si faltan
      const promos = promosRequeridas[cat.id] ?? [];
      for (const promo of promos) {
        if (!subsFiltrados.find((s: any) => s.id === promo.id)) {
          subsFiltrados.push({ ...promo, activo: true });
        }
      }

      return {
        ...cat,
        jornadas: jornadasPorCategoria[cat.id] ?? cat.jornadas ?? [],
        subservicios: subsFiltrados,
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
