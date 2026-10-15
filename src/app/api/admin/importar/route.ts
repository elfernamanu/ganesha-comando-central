/**
 * POST /api/admin/importar  { claves: { [claveLocalStorage]: valor } }
 *
 * Carga en la base de datos una copia de seguridad de un dispositivo
 * (la que descarga /admin/panel-control/copia). Nunca borra ni pisa:
 * - Turnos: agrega a cada día los turnos que el servidor no tiene, y en los que
 *   ya tiene completa lo vacío (asistencia, servicio, cobro) sin borrar nada.
 * - Contactos: agrega los que faltan y completa celulares vacíos, también con los
 *   celulares que la secretaria anotó en el detalle de los turnos.
 * - Precios, combos y gastos fijos: solo si el servidor no tiene.
 * - Gastos de caja: solo los días que el servidor no tiene.
 * Antes de modificar algo que ya existía, guarda un respaldo.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query, problemaDeConfiguracion, explicarErrorDeConexion } from '@/lib/db';
import { guardarBackup } from '@/lib/backup';
import { claveTurno, combinarTurno, celularDeDetalle, type Registro } from '@/lib/combinarTurnos';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function lista(v: unknown): Registro[] {
  return Array.isArray(v) ? v.filter((x): x is Registro => !!x && typeof x === 'object') : [];
}

async function leerDatos(sql: string, params: unknown[]): Promise<Registro[] | null> {
  const rows = await query<{ datos: unknown }>(sql, params);
  return rows[0] ? lista(rows[0].datos) : null;
}

async function cargarConfigSiFalta(id: number, local: Registro[], tablaBackup: string): Promise<string> {
  if (local.length === 0) return 'sin datos en la copia';
  const actual = await leerDatos('SELECT datos FROM config_servicios WHERE id = $1', [id]);
  if (actual && actual.length > 0) return 'ya estaban en el servidor';
  if (actual) await guardarBackup(tablaBackup, '1', actual);
  await query(
    `INSERT INTO config_servicios (id, datos, actualizado_at) VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
    [id, JSON.stringify(local)]
  );
  return `cargados (${local.length})`;
}

export async function POST(req: NextRequest) {
  const problema = problemaDeConfiguracion();
  if (problema) return NextResponse.json({ ok: false, error: problema }, { status: 503 });

  let claves: Record<string, unknown>;
  try {
    const body = await req.json() as { claves?: unknown };
    if (!body.claves || typeof body.claves !== 'object' || Array.isArray(body.claves)) throw new Error();
    claves = body.claves as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'El archivo no es una copia de seguridad de Ganesha' }, { status: 400 });
  }

  const resumen = {
    diasNuevos: 0,
    diasCompletados: 0,
    turnosAgregados: 0,
    turnosCompletados: 0,
    contactosAgregados: 0,
    celularesCompletados: 0,
    precios: '',
    combos: '',
    gastosEmpresa: '',
    gastosPersonal: '',
    diasConGastos: 0,
  };

  try {
    // ── Turnos ──────────────────────────────────────────────────────────────
    for (const [k, v] of Object.entries(claves)) {
      if (!k.startsWith('ganesha_turnos_')) continue;
      const fecha = k.slice('ganesha_turnos_'.length);
      const local = lista(v);
      if (!FECHA.test(fecha) || local.length === 0) continue;

      const servidor = await leerDatos('SELECT datos FROM turnos WHERE fecha = $1', [fecha]) ?? [];
      const copiaPorClave = new Map(local.map(t => [claveTurno(t), t]));
      let completados = 0;
      const combinados = servidor.map(s => {
        const c = copiaPorClave.get(claveTurno(s));
        if (!c) return s;
        const r = combinarTurno(s, c);
        if (JSON.stringify(r) !== JSON.stringify(s)) completados++;
        return r;
      });
      const yaEstan = new Set(servidor.map(claveTurno));
      const nuevos = local.filter(t => !yaEstan.has(claveTurno(t)));
      if (nuevos.length === 0 && completados === 0) continue;

      if (servidor.length > 0) await guardarBackup('turnos', fecha, servidor);
      const union = [...combinados, ...nuevos].sort((a, b) => String(a.horario ?? '').localeCompare(String(b.horario ?? '')));
      await query(
        `INSERT INTO turnos (fecha, datos, actualizado_at) VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (fecha) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
        [fecha, JSON.stringify(union)]
      );
      if (servidor.length === 0) resumen.diasNuevos++; else resumen.diasCompletados++;
      resumen.turnosAgregados += nuevos.length;
      resumen.turnosCompletados += completados;
    }

    // ── Contactos: la lista guardada + los celulares anotados en el detalle de los turnos ──
    const contactosLocal = lista(claves['ganesha_clientes_backup']);
    for (const [k, v] of Object.entries(claves)) {
      if (!k.startsWith('ganesha_turnos_')) continue;
      for (const t of lista(v)) {
        const nombre = String(t.clienteNombre ?? '').trim();
        const celular = celularDeDetalle(t.detalle);
        if (nombre && celular) {
          contactosLocal.push({ id: crypto.randomUUID(), nombre, celular, notas: '' });
        }
      }
    }
    if (contactosLocal.length > 0) {
      const servidor = await leerDatos('SELECT datos FROM clientes_telefonos WHERE id = 1', []) ?? [];
      const porNombre = new Map(servidor.map(c => [String(c.nombre ?? '').trim().toLowerCase(), { ...c }]));
      let cambio = false;
      for (const c of contactosLocal) {
        const nombre = String(c.nombre ?? '').trim().toLowerCase();
        if (!nombre) continue;
        const existente = porNombre.get(nombre);
        if (!existente) {
          porNombre.set(nombre, { ...c });
          resumen.contactosAgregados++;
          cambio = true;
        } else if (!existente.celular && c.celular) {
          existente.celular = c.celular;
          resumen.celularesCompletados++;
          cambio = true;
        }
      }
      if (cambio) {
        if (servidor.length > 0) await guardarBackup('clientes', '1', servidor);
        const json = JSON.stringify([...porNombre.values()]);
        await query(
          `INSERT INTO clientes_telefonos (id, datos, actualizado_at) VALUES (1, $1::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
          [json]
        );
        await query(
          `INSERT INTO config_servicios (id, datos, actualizado_at) VALUES (-4, $1::jsonb, NOW())
           ON CONFLICT (id) DO UPDATE SET datos = EXCLUDED.datos, actualizado_at = NOW()`,
          [json]
        );
      }
    }

    // ── Precios, combos y gastos fijos ──────────────────────────────────────
    resumen.precios        = await cargarConfigSiFalta(1,  lista(claves['ganesha_config_servicios']), 'config');
    resumen.combos         = await cargarConfigSiFalta(-3, lista(claves['ganesha_catalog_combos_raw']), 'combos');
    resumen.gastosEmpresa  = await cargarConfigSiFalta(-1, lista(claves['ganesha_gastos_fijos_empresa_v2']), 'gastos_empresa');
    resumen.gastosPersonal = await cargarConfigSiFalta(-2, lista(claves['ganesha_gastos_fijos_personal_v2']), 'gastos_personal');

    // ── Gastos de caja por día ──────────────────────────────────────────────
    for (const [k, v] of Object.entries(claves)) {
      if (!k.startsWith('ganesha_gastos_') || k.startsWith('ganesha_gastos_fijos')) continue;
      const fecha = k.slice('ganesha_gastos_'.length);
      const gastos = lista(v);
      if (!FECHA.test(fecha) || gastos.length === 0) continue;
      const insertado = await query(
        `INSERT INTO caja_diaria (fecha, datos, cerrada, actualizado)
         VALUES ($1, jsonb_build_object('gastos', $2::jsonb), false, NOW())
         ON CONFLICT (fecha) DO NOTHING RETURNING fecha`,
        [fecha, JSON.stringify(gastos)]
      );
      if (insertado.length > 0) resumen.diasConGastos++;
    }

    return NextResponse.json({ ok: true, resumen });
  } catch (err) {
    return NextResponse.json({ ok: false, error: explicarErrorDeConexion(err), resumen }, { status: 500 });
  }
}
