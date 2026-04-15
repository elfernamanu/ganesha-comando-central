'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TipoGastoFijo = 'empresa' | 'personal';

export interface GastoFijo {
  id: string;
  nombre: string;
  tipo: TipoGastoFijo;
  montoTotal: number;
  montoAcumulado: number;
  pagado: boolean;
  activo: boolean;
  fechaCreacion: string;
  fechaUltimoPago?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LS_EMPRESA  = 'ganesha_gastos_fijos_empresa';
const LS_PERSONAL = 'ganesha_gastos_fijos_personal';

const GASTOS_PERSONALES_DEFAULT: GastoFijo[] = [
  { id: 'personal_luz',  nombre: 'Luz Casa',  tipo: 'personal', montoTotal: 0, montoAcumulado: 0, pagado: false, activo: true, fechaCreacion: '' },
  { id: 'personal_gas',  nombre: 'Gas Casa',  tipo: 'personal', montoTotal: 0, montoAcumulado: 0, pagado: false, activo: true, fechaCreacion: '' },
  { id: 'personal_gym',  nombre: 'Gym',       tipo: 'personal', montoTotal: 0, montoAcumulado: 0, pagado: false, activo: true, fechaCreacion: '' },
  { id: 'personal_arba', nombre: 'ARBA',      tipo: 'personal', montoTotal: 0, montoAcumulado: 0, pagado: false, activo: true, fechaCreacion: '' },
];

// ─── Helpers localStorage ────────────────────────────────────────────────────

function lsGet(key: string): GastoFijo[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GastoFijo[]) : null;
  } catch { return null; }
}

function lsSet(key: string, data: GastoFijo[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* silencioso */ }
}

function generarId(tipo: TipoGastoFijo): string {
  return `${tipo}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useGastosFijos() {
  const [empresa,  setEmpresa]  = useState<GastoFijo[]>([]);
  const [personal, setPersonal] = useState<GastoFijo[]>([]);

  // Controla si los datos ya cargaron del servidor (evita sobrescribir con datos parciales)
  const serverLoaded = useRef(false);
  // Debounce timer para auto-save al servidor
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cargar: localStorage inmediato → servidor (fuente de verdad) ──────────
  useEffect(() => {
    // 1. localStorage: respuesta visual inmediata mientras llega el servidor
    const empLS  = lsGet(LS_EMPRESA);
    const perLS  = lsGet(LS_PERSONAL);
    if (empLS)  setEmpresa(empLS);
    if (perLS)  setPersonal(perLS);
    else        setPersonal(GASTOS_PERSONALES_DEFAULT);

    // 2. Servidor: fuente de verdad — sincroniza entre todos los dispositivos
    fetch('/api/gastos-fijos')
      .then(r => r.json())
      .then(data => {
        if (!data.ok) return;
        serverLoaded.current = true;

        if (Array.isArray(data.empresa)) {
          setEmpresa(data.empresa);
          lsSet(LS_EMPRESA, data.empresa);
        }
        if (Array.isArray(data.personal) && data.personal.length > 0) {
          setPersonal(data.personal);
          lsSet(LS_PERSONAL, data.personal);
        } else if (!Array.isArray(data.personal) || data.personal.length === 0) {
          // Primera vez: servidor vacío → usar defaults y guardar
          if (!empLS && !perLS) {
            guardarEnServidor([], GASTOS_PERSONALES_DEFAULT);
          }
          serverLoaded.current = true;
        }
      })
      .catch(() => {
        // Sin conexión: los datos de localStorage son suficientes
        serverLoaded.current = true;
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Guardar en servidor (fire-and-forget con manejo de error silencioso) ──
  function guardarEnServidor(emp: GastoFijo[], per: GastoFijo[]) {
    fetch('/api/gastos-fijos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empresa: emp, personal: per }),
    }).catch(() => { /* silencioso — localStorage sigue funcionando */ });
  }

  // ── Auto-save debounced: 1.5s después del último cambio ──────────────────
  function programarGuardado(emp: GastoFijo[], per: GastoFijo[]) {
    if (!serverLoaded.current) return; // no guardar antes de cargar del servidor
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      lsSet(LS_EMPRESA,  emp);
      lsSet(LS_PERSONAL, per);
      guardarEnServidor(emp, per);
    }, 1500);
  }

  // ─── Setters que también programan guardado ───────────────────────────────

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

  // ── Operaciones empresa ──────────────────────────────────────────────────

  const agregarEmpresa = useCallback((nombre: string, monto: number) => {
    const nuevo: GastoFijo = {
      id: generarId('empresa'),
      nombre: nombre.trim(),
      tipo: 'empresa',
      montoTotal: monto,
      montoAcumulado: 0,
      pagado: false,
      activo: true,
      fechaCreacion: hoy(),
    };
    actualizarEmpresa(prev => [...prev, nuevo]);
  }, [actualizarEmpresa]);

  // ── Operaciones personal ─────────────────────────────────────────────────

  const agregarPersonal = useCallback((nombre: string, monto: number) => {
    const nuevo: GastoFijo = {
      id: generarId('personal'),
      nombre: nombre.trim(),
      tipo: 'personal',
      montoTotal: monto,
      montoAcumulado: 0,
      pagado: false,
      activo: true,
      fechaCreacion: hoy(),
    };
    actualizarPersonal(prev => [...prev, nuevo]);
  }, [actualizarPersonal]);

  // ── Operaciones compartidas ──────────────────────────────────────────────

  const pagarGasto = useCallback((id: string, monto: number, tipo: TipoGastoFijo) => {
    const fn = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => {
        if (g.id !== id) return g;
        const nuevoAcumulado = Math.min(g.montoAcumulado + monto, g.montoTotal || monto);
        const pagado = g.montoTotal > 0 ? nuevoAcumulado >= g.montoTotal : false;
        return { ...g, montoAcumulado: nuevoAcumulado, pagado, fechaUltimoPago: hoy() };
      });
    if (tipo === 'empresa') actualizarEmpresa(fn);
    else actualizarPersonal(fn);
  }, [actualizarEmpresa, actualizarPersonal]);

  const resetearGasto = useCallback((id: string, tipo: TipoGastoFijo) => {
    const fn = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => g.id !== id ? g : { ...g, montoAcumulado: 0, pagado: false, fechaUltimoPago: undefined });
    if (tipo === 'empresa') actualizarEmpresa(fn);
    else actualizarPersonal(fn);
  }, [actualizarEmpresa, actualizarPersonal]);

  const eliminarGasto = useCallback((id: string, tipo: TipoGastoFijo) => {
    if (tipo === 'empresa') actualizarEmpresa(prev => prev.filter(g => g.id !== id));
    else actualizarPersonal(prev => prev.filter(g => g.id !== id));
  }, [actualizarEmpresa, actualizarPersonal]);

  const actualizarMonto = useCallback((id: string, monto: number, tipo: TipoGastoFijo) => {
    const fn = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => {
        if (g.id !== id) return g;
        const pagado = monto > 0 ? g.montoAcumulado >= monto : false;
        return { ...g, montoTotal: monto, pagado };
      });
    if (tipo === 'empresa') actualizarEmpresa(fn);
    else actualizarPersonal(fn);
  }, [actualizarEmpresa, actualizarPersonal]);

  const actualizarNombre = useCallback((id: string, nombre: string, tipo: TipoGastoFijo) => {
    const fn = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => g.id !== id ? g : { ...g, nombre: nombre.trim() });
    if (tipo === 'empresa') actualizarEmpresa(fn);
    else actualizarPersonal(fn);
  }, [actualizarEmpresa, actualizarPersonal]);

  // ── Computed ─────────────────────────────────────────────────────────────

  const totalPendienteEmpresa = useMemo(
    () => empresa.filter(g => !g.pagado && g.activo).reduce((s, g) => s + Math.max(0, g.montoTotal - g.montoAcumulado), 0),
    [empresa]
  );

  const totalPendientePersonal = useMemo(
    () => personal.filter(g => !g.pagado && g.activo).reduce((s, g) => s + Math.max(0, g.montoTotal - g.montoAcumulado), 0),
    [personal]
  );

  return {
    empresa,
    personal,
    agregarEmpresa,
    agregarPersonal,
    pagarGasto,
    resetearGasto,
    eliminarGasto,
    actualizarMonto,
    actualizarNombre,
    totalPendienteEmpresa,
    totalPendientePersonal,
  };
}
