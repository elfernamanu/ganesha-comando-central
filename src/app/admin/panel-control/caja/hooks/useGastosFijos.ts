'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

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

const KEY_EMPRESA  = 'ganesha_gastos_fijos_empresa';
const KEY_PERSONAL = 'ganesha_gastos_fijos_personal';

const GASTOS_PERSONALES_DEFAULT: GastoFijo[] = [
  { id: 'personal_luz',  nombre: 'Luz Casa',  tipo: 'personal', montoTotal: 0, montoAcumulado: 0, pagado: false, activo: true, fechaCreacion: new Date().toISOString().split('T')[0] },
  { id: 'personal_gas',  nombre: 'Gas Casa',  tipo: 'personal', montoTotal: 0, montoAcumulado: 0, pagado: false, activo: true, fechaCreacion: new Date().toISOString().split('T')[0] },
  { id: 'personal_gym',  nombre: 'Gym',       tipo: 'personal', montoTotal: 0, montoAcumulado: 0, pagado: false, activo: true, fechaCreacion: new Date().toISOString().split('T')[0] },
  { id: 'personal_arba', nombre: 'ARBA',      tipo: 'personal', montoTotal: 0, montoAcumulado: 0, pagado: false, activo: true, fechaCreacion: new Date().toISOString().split('T')[0] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cargarDesdeStorage(key: string, defaults: GastoFijo[]): GastoFijo[] {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as GastoFijo[];
    return defaults;
  } catch {
    return defaults;
  }
}

function guardarEnStorage(key: string, data: GastoFijo[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* silencioso */ }
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
  const [empresa, setEmpresa] = useState<GastoFijo[]>([]);
  const [personal, setPersonal] = useState<GastoFijo[]>([]);
  const [cargado, setCargado] = useState(false);

  // Carga desde localStorage solo en el cliente
  useEffect(() => {
    setEmpresa(cargarDesdeStorage(KEY_EMPRESA, []));
    setPersonal(cargarDesdeStorage(KEY_PERSONAL, GASTOS_PERSONALES_DEFAULT));
    setCargado(true);
  }, []);

  // Persiste empresa
  useEffect(() => {
    if (!cargado) return;
    guardarEnStorage(KEY_EMPRESA, empresa);
  }, [empresa, cargado]);

  // Persiste personal
  useEffect(() => {
    if (!cargado) return;
    guardarEnStorage(KEY_PERSONAL, personal);
  }, [personal, cargado]);

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
    setEmpresa(prev => [...prev, nuevo]);
  }, []);

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
    setPersonal(prev => [...prev, nuevo]);
  }, []);

  // ── Operaciones compartidas ──────────────────────────────────────────────

  const pagarGasto = useCallback((id: string, monto: number, tipo: TipoGastoFijo) => {
    const actualizar = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => {
        if (g.id !== id) return g;
        const nuevoAcumulado = Math.min(g.montoAcumulado + monto, g.montoTotal || monto);
        const pagado = g.montoTotal > 0 ? nuevoAcumulado >= g.montoTotal : false;
        return {
          ...g,
          montoAcumulado: nuevoAcumulado,
          pagado,
          fechaUltimoPago: hoy(),
        };
      });

    if (tipo === 'empresa') setEmpresa(actualizar);
    else setPersonal(actualizar);
  }, []);

  const resetearGasto = useCallback((id: string, tipo: TipoGastoFijo) => {
    const actualizar = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g =>
        g.id !== id ? g : { ...g, montoAcumulado: 0, pagado: false, fechaUltimoPago: undefined }
      );

    if (tipo === 'empresa') setEmpresa(actualizar);
    else setPersonal(actualizar);
  }, []);

  const eliminarGasto = useCallback((id: string, tipo: TipoGastoFijo) => {
    if (tipo === 'empresa') setEmpresa(prev => prev.filter(g => g.id !== id));
    else setPersonal(prev => prev.filter(g => g.id !== id));
  }, []);

  const actualizarMonto = useCallback((id: string, monto: number, tipo: TipoGastoFijo) => {
    const actualizar = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => {
        if (g.id !== id) return g;
        const pagado = monto > 0 ? g.montoAcumulado >= monto : false;
        return { ...g, montoTotal: monto, pagado };
      });

    if (tipo === 'empresa') setEmpresa(actualizar);
    else setPersonal(actualizar);
  }, []);

  const actualizarNombre = useCallback((id: string, nombre: string, tipo: TipoGastoFijo) => {
    const actualizar = (prev: GastoFijo[]): GastoFijo[] =>
      prev.map(g => g.id !== id ? g : { ...g, nombre: nombre.trim() });

    if (tipo === 'empresa') setEmpresa(actualizar);
    else setPersonal(actualizar);
  }, []);

  // ── Computed ─────────────────────────────────────────────────────────────

  const totalPendienteEmpresa = useMemo(
    () => empresa.filter(g => !g.pagado).reduce((s, g) => s + Math.max(0, g.montoTotal - g.montoAcumulado), 0),
    [empresa]
  );

  const totalPendientePersonal = useMemo(
    () => personal.filter(g => !g.pagado).reduce((s, g) => s + Math.max(0, g.montoTotal - g.montoAcumulado), 0),
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
