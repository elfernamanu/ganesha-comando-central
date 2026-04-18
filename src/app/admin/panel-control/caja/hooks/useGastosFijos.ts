'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TipoGastoFijo = 'empresa' | 'personal';

export interface PagoMes {
  montoAcumulado: number;
  pagado: boolean;
  fechaPago?: string;
}

export interface GastoFijo {
  id: string;
  nombre: string;
  tipo: TipoGastoFijo;
  montoTotal: number;
  activo: boolean;
  fechaCreacion: string;
  // Pagos por mes — key = "YYYY-MM", ej: "2026-04"
  pagos: Record<string, PagoMes>;
  // Campos legacy opcionales — para compatibilidad con SugerenciaPago
  montoAcumulado?: number;
  pagado?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// v2 keys — nueva estructura con pagos por mes
const LS_EMPRESA  = 'ganesha_gastos_fijos_empresa_v2';
const LS_PERSONAL = 'ganesha_gastos_fijos_personal_v2';

// Función en lugar de constante para que fechaCreacion sea el día de hoy real
// IDs fijos de gastos personales requeridos — se agregan si faltan, sin tocar los existentes
const PERSONAL_REQUERIDOS = [
  { id: 'personal_luz',     nombre: 'Luz Casa' },
  { id: 'personal_gas',     nombre: 'Gas Casa' },
  { id: 'personal_gym',     nombre: 'Gym'      },
  { id: 'personal_arba',    nombre: 'ARBA'     },
  { id: 'personal_aysa',    nombre: 'AYSA'     },
  { id: 'personal_flow',    nombre: 'FLOW'     },
  { id: 'personal_targeta', nombre: 'TARGETA'  },
];

function gastoPersonalDefault(): GastoFijo[] {
  const hoy = hoyStr();
  return PERSONAL_REQUERIDOS.map(r => ({
    id: r.id, nombre: r.nombre, tipo: 'personal' as TipoGastoFijo,
    montoTotal: 0, activo: true, fechaCreacion: hoy, pagos: {},
  }));
}

// Clave que indica que la migración inicial ya corrió — no volver a agregar gastos borrados
const LS_PERSONAL_MIGRADO = 'ganesha_personal_migrado_v1';

// Agrega los gastos requeridos que falten — solo corre UNA VEZ (primera vez)
// Después respeta lo que el usuario haya borrado
function mergePersonalRequeridos(existentes: GastoFijo[]): { lista: GastoFijo[]; huboNuevos: boolean } {
  if (typeof window !== 'undefined' && localStorage.getItem(LS_PERSONAL_MIGRADO)) {
    return { lista: existentes, huboNuevos: false }; // ya migró — no re-agregar borrados
  }
  const idsExistentes = new Set(existentes.map(g => g.id));
  const hoy = hoyStr();
  const nuevos = PERSONAL_REQUERIDOS
    .filter(r => !idsExistentes.has(r.id))
    .map(r => ({
      id: r.id, nombre: r.nombre, tipo: 'personal' as TipoGastoFijo,
      montoTotal: 0, activo: true, fechaCreacion: hoy, pagos: {},
    }));
  if (typeof window !== 'undefined') localStorage.setItem(LS_PERSONAL_MIGRADO, '1');
  return { lista: [...existentes, ...nuevos], huboNuevos: nuevos.length > 0 };
}

// ─── Migración de formato viejo (sin pagos[]) al nuevo ───────────────────────

function migrarGasto(raw: Record<string, unknown>): GastoFijo {
  // Si ya tiene el campo pagos, es formato nuevo
  if (raw.pagos && typeof raw.pagos === 'object' && !Array.isArray(raw.pagos)) {
    return raw as unknown as GastoFijo;
  }
  // Formato viejo: tiene montoAcumulado/pagado a nivel raíz
  // Migramos al mes actual para no perder los datos actuales
  const d = new Date();
  const mesHoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const montoAcumulado = (raw.montoAcumulado as number) ?? 0;
  const pagado = (raw.pagado as boolean) ?? false;

  const pagos: Record<string, PagoMes> = {};
  if (montoAcumulado > 0 || pagado) {
    pagos[mesHoy] = {
      montoAcumulado,
      pagado,
      fechaPago: (raw.fechaUltimoPago as string) ?? undefined,
    };
  }

  return {
    id: (raw.id as string) ?? '',
    nombre: (raw.nombre as string) ?? '',
    tipo: (raw.tipo as TipoGastoFijo) ?? 'empresa',
    montoTotal: (raw.montoTotal as number) ?? 0,
    activo: (raw.activo as boolean) ?? true,
    fechaCreacion: (raw.fechaCreacion as string) ?? '',
    pagos,
  };
}

// ─── Helpers localStorage ─────────────────────────────────────────────────────

function lsGet(key: string): GastoFijo[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(g => migrarGasto(g as Record<string, unknown>));
  } catch { return null; }
}

function lsSet(key: string, data: GastoFijo[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* silencioso */ }
}

// ─── Helpers de fechas ────────────────────────────────────────────────────────

function hoyStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mesAnteriorDe(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const prev = new Date(y, m - 2, 1); // m-2 porque m es 1-based y Date es 0-based
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
}

function nombreMes(mes: string): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function generarId(tipo: TipoGastoFijo): string {
  return `${tipo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useGastosFijos(fecha)
 *
 * Gastos fijos con estado POR MES.
 * - Las definiciones (nombre, monto) son permanentes — no se re-cargan cada fecha.
 * - El estado de pago (pagado, cuánto) se guarda por mes ("2026-04", "2026-05", ...).
 * - Al abrir una fecha de otro mes, los gastos aparecen como NO pagados para ese mes.
 * - Muestra deuda del mes anterior si quedaron gastos sin pagar.
 * - Tiene botón Guardar explícito + auto-save debounced.
 */
export function useGastosFijos(fecha: string) {
  // Mes de la fecha seleccionada: "2026-04"
  const mes = fecha.slice(0, 7);
  const mesAnt = mesAnteriorDe(mes);

  const [empresa,  setEmpresa]  = useState<GastoFijo[]>([]);
  const [personal, setPersonal] = useState<GastoFijo[]>([]);

  // Estado del guardado explícito
  const [guardando,  setGuardando]  = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'guardando' | 'guardado' | 'error'>('idle');

  const serverLoaded = useRef(false);
  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cargar: localStorage (inmediato) → servidor (fuente de verdad) ─────────
  useEffect(() => {
    // 1. localStorage para respuesta visual inmediata
    const empLS = lsGet(LS_EMPRESA);
    const perLS = lsGet(LS_PERSONAL);
    if (empLS) setEmpresa(empLS);
    if (perLS) setPersonal(perLS);
    else       setPersonal(gastoPersonalDefault());

    // 2. Servidor — fuente de verdad entre dispositivos
    fetch('/api/gastos-fijos')
      .then(r => r.json())
      .then(data => {
        if (!data.ok) return;
        serverLoaded.current = true;

        if (Array.isArray(data.empresa) && data.empresa.length > 0) {
          const migrados = (data.empresa as Record<string, unknown>[]).map(migrarGasto);
          setEmpresa(migrados);
          lsSet(LS_EMPRESA, migrados);
        }
        if (Array.isArray(data.personal) && data.personal.length > 0) {
          const migrados = (data.personal as Record<string, unknown>[]).map(migrarGasto);
          const { lista: merged, huboNuevos } = mergePersonalRequeridos(migrados);
          setPersonal(merged);
          lsSet(LS_PERSONAL, merged);
          // Si faltaban gastos requeridos, guardar en servidor automáticamente
          if (huboNuevos) {
            const empActual = Array.isArray(data.empresa) && data.empresa.length > 0
              ? (data.empresa as Record<string, unknown>[]).map(migrarGasto)
              : lsGet(LS_EMPRESA) ?? [];
            _guardarEnServidor(empActual, merged);
          }
        } else {
          // Sin datos en servidor: inicializar con todos los defaults
          const defaults = gastoPersonalDefault();
          setPersonal(defaults);
          lsSet(LS_PERSONAL, defaults);
          _guardarEnServidor(lsGet(LS_EMPRESA) ?? [], defaults);
          serverLoaded.current = true;
        }
      })
      .catch(() => { serverLoaded.current = true; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guardar en servidor (fire-and-forget interno) ──────────────────────────
  function _guardarEnServidor(emp: GastoFijo[], per: GastoFijo[]): Promise<Response> {
    return fetch('/api/gastos-fijos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa: emp, personal: per }),
    });
  }

  // ── Auto-save debounced: 2s después del último cambio ─────────────────────
  function programarGuardado(emp: GastoFijo[], per: GastoFijo[]) {
    if (!serverLoaded.current) return;
    lsSet(LS_EMPRESA, emp);
    lsSet(LS_PERSONAL, per);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      _guardarEnServidor(emp, per).catch(() => {/* silencioso */});
    }, 2000);
  }

  // ── Guardar EXPLÍCITO — botón "Guardar" ────────────────────────────────────
  const guardar = useCallback(async (): Promise<boolean> => {
    setGuardando(true);
    setSyncStatus('guardando');
    if (syncTimer.current) clearTimeout(syncTimer.current);
    if (saveTimer.current) clearTimeout(saveTimer.current); // cancelar auto-save pendiente

    // Capturamos los valores actuales mediante setState funcional
    return new Promise<boolean>(resolve => {
      setEmpresa(emp => {
        setPersonal(per => {
          lsSet(LS_EMPRESA, emp);
          lsSet(LS_PERSONAL, per);

          _guardarEnServidor(emp, per)
            .then(r => r.json())
            .then(data => {
              setSyncStatus(data.ok ? 'guardado' : 'error');
              syncTimer.current = setTimeout(() => setSyncStatus('idle'), 3000);
              setGuardando(false);
              resolve(data.ok as boolean);
            })
            .catch(() => {
              setSyncStatus('error');
              syncTimer.current = setTimeout(() => setSyncStatus('idle'), 4000);
              setGuardando(false);
              resolve(false);
            });

          return per; // no mutation
        });
        return emp; // no mutation
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Setters con auto-save ────────────────────────────────────────────────

  const actualizarEmpresa = useCallback((fn: (prev: GastoFijo[]) => GastoFijo[]) => {
    setEmpresa(prev => {
      const next = fn(prev);
      setPersonal(per => { programarGuardado(next, per); return per; });
      return next;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const actualizarPersonal = useCallback((fn: (prev: GastoFijo[]) => GastoFijo[]) => {
    setPersonal(prev => {
      const next = fn(prev);
      setEmpresa(emp => { programarGuardado(emp, next); return emp; });
      return next;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Obtener pago del mes activo ──────────────────────────────────────────

  const getPagoMes = useCallback((g: GastoFijo): PagoMes => {
    return g.pagos[mes] ?? { montoAcumulado: 0, pagado: false };
  }, [mes]);

  // ── Agregar ───────────────────────────────────────────────────────────────

  const agregarEmpresa = useCallback((nombre: string, monto: number) => {
    actualizarEmpresa(prev => [...prev, {
      id: generarId('empresa'),
      nombre: nombre.trim(),
      tipo: 'empresa',
      montoTotal: monto,
      activo: true,
      fechaCreacion: hoyStr(),
      pagos: {},
    }]);
  }, [actualizarEmpresa]);

  const agregarPersonal = useCallback((nombre: string, monto: number) => {
    actualizarPersonal(prev => [...prev, {
      id: generarId('personal'),
      nombre: nombre.trim(),
      tipo: 'personal',
      montoTotal: monto,
      activo: true,
      fechaCreacion: hoyStr(),
      pagos: {},
    }]);
  }, [actualizarPersonal]);

  // ── Pagar (para el mes de la fecha seleccionada) ──────────────────────────

  const pagarGasto = useCallback((id: string, monto: number, tipo: TipoGastoFijo) => {
    const fn = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => {
        if (g.id !== id) return g;
        const pagoActual = g.pagos[mes] ?? { montoAcumulado: 0, pagado: false };
        const nuevoAcumulado = Math.min(pagoActual.montoAcumulado + monto, g.montoTotal || monto);
        const pagado = g.montoTotal > 0 ? nuevoAcumulado >= g.montoTotal : false;
        return {
          ...g,
          pagos: { ...g.pagos, [mes]: { montoAcumulado: nuevoAcumulado, pagado, fechaPago: hoyStr() } },
        };
      });
    if (tipo === 'empresa') actualizarEmpresa(fn);
    else actualizarPersonal(fn);
  }, [mes, actualizarEmpresa, actualizarPersonal]);

  // ── Resetear pago del mes activo ──────────────────────────────────────────

  const resetearGasto = useCallback((id: string, tipo: TipoGastoFijo) => {
    const fn = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => {
        if (g.id !== id) return g;
        const nuevosPagos = { ...g.pagos };
        delete nuevosPagos[mes];
        return { ...g, pagos: nuevosPagos };
      });
    if (tipo === 'empresa') actualizarEmpresa(fn);
    else actualizarPersonal(fn);
  }, [mes, actualizarEmpresa, actualizarPersonal]);

  // ── Eliminar ──────────────────────────────────────────────────────────────

  const eliminarGasto = useCallback((id: string, tipo: TipoGastoFijo) => {
    if (tipo === 'empresa') actualizarEmpresa(prev => prev.filter(g => g.id !== id));
    else actualizarPersonal(prev => prev.filter(g => g.id !== id));
  }, [actualizarEmpresa, actualizarPersonal]);

  // ── Actualizar monto total ────────────────────────────────────────────────

  const actualizarMonto = useCallback((id: string, monto: number, tipo: TipoGastoFijo) => {
    const fn = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => {
        if (g.id !== id) return g;
        const pagoActual = g.pagos[mes] ?? { montoAcumulado: 0, pagado: false };
        const pagado = monto > 0 ? pagoActual.montoAcumulado >= monto : false;
        return {
          ...g,
          montoTotal: monto,
          pagos: { ...g.pagos, [mes]: { ...pagoActual, pagado } },
        };
      });
    if (tipo === 'empresa') actualizarEmpresa(fn);
    else actualizarPersonal(fn);
  }, [mes, actualizarEmpresa, actualizarPersonal]);

  // ── Actualizar nombre ─────────────────────────────────────────────────────

  const actualizarNombre = useCallback((id: string, nombre: string, tipo: TipoGastoFijo) => {
    const fn = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => g.id !== id ? g : { ...g, nombre: nombre.trim() });
    if (tipo === 'empresa') actualizarEmpresa(fn);
    else actualizarPersonal(fn);
  }, [actualizarEmpresa, actualizarPersonal]);

  // ── Computed: pendiente del MES ACTUAL ────────────────────────────────────

  const totalPendienteEmpresa = useMemo(
    () => empresa.filter(g => g.activo).reduce((s, g) => {
      const p = g.pagos[mes] ?? { montoAcumulado: 0, pagado: false };
      return s + Math.max(0, g.montoTotal - p.montoAcumulado);
    }, 0),
    [empresa, mes]
  );

  const totalPendientePersonal = useMemo(
    () => personal.filter(g => g.activo).reduce((s, g) => {
      const p = g.pagos[mes] ?? { montoAcumulado: 0, pagado: false };
      return s + Math.max(0, g.montoTotal - p.montoAcumulado);
    }, 0),
    [personal, mes]
  );

  // ── Computed: deuda del MES ANTERIOR ─────────────────────────────────────
  //
  // REGLA: solo se muestra deuda si el gasto fue creado ANTES del mes actual.
  // Si el gasto se acaba de crear este mes → sin deuda (es nuevo, no existía antes).
  // Si fechaCreacion está vacía (datos legacy) → sin deuda (no sabemos cuándo existía).
  //
  // Esto evita el cartel de "te falta de marzo" cuando recién se carga el alquiler hoy.
  const deudaMesAnterior = useMemo(() => {
    const todos = [...empresa, ...personal];
    return todos
      .filter(g => {
        if (!g.activo || g.montoTotal <= 0) return false;
        // Si no tiene fechaCreacion o fue creado en el mes actual → sin deuda
        if (!g.fechaCreacion) return false;
        const mesCreacion = g.fechaCreacion.slice(0, 7); // "YYYY-MM"
        // Solo hay deuda si el gasto existía ANTES del mes actual (creado en mes anterior o antes)
        return mesCreacion < mes;
      })
      .reduce((s, g) => {
        const p = g.pagos[mesAnt] ?? { montoAcumulado: 0, pagado: false };
        return s + Math.max(0, g.montoTotal - p.montoAcumulado);
      }, 0);
  }, [empresa, personal, mesAnt, mes]);

  return {
    empresa,
    personal,
    mes,
    mesAnterior: mesAnt,
    nombreMesAnterior: nombreMes(mesAnt),
    nombreMesActual: nombreMes(mes),
    deudaMesAnterior,
    guardando,
    syncStatus,
    getPagoMes,
    agregarEmpresa,
    agregarPersonal,
    pagarGasto,
    resetearGasto,
    eliminarGasto,
    actualizarMonto,
    actualizarNombre,
    guardar,
    totalPendienteEmpresa,
    totalPendientePersonal,
  };
}
