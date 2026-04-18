'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Gasto } from '../types/index';
import type { Turno } from '../../_shared/turnoType';
import type { GastoFijo } from './useGastosFijos';

// Re-exportamos para que reporteGenerator.ts y page.tsx puedan importar desde aquí
export type { Turno as TurnoSecretaria };  // alias de compatibilidad

export interface TotalesCaja {
  ingresos_totales: number;
  gastos_totales: number;
  ganancia_neta: number;
  turnos_total: number;
  turnos_presentes: number;
  turnos_ausentes: number;
  // Desglose por método de pago
  efectivo: number;
  transferencia: number;
  otro: number;
}

/**
 * Hook principal de Caja Diaria
 *
 * FLUJO DE PERSISTENCIA:
 *   - Turnos:      localStorage (secretaria) → /api/sync (fuente de verdad)
 *   - Gastos día:  localStorage (caché) → /api/caja parcial (auto-save 1.5s)
 *   - Gastos fijos: /api/gastos-fijos (independiente, no depende del cierre)
 *   - Cierre caja: /api/caja completo → snapshot histórico permanente
 *
 * Los gastos del día se guardan SOLOS — no hay que cerrar la caja para persistirlos.
 */
export function useCajaDiaria(fecha: string) {

  // ========================================
  // TURNOS (solo lectura — escritos por secretaria)
  // ========================================
  const [turnos,         setTurnos]         = useState<Turno[]>([]);
  const [cargandoTurnos, setCargandoTurnos] = useState(true);
  const [cargandoCaja,   setCargandoCaja]   = useState(true);

  const cargarTurnos = useCallback(async () => {
    // Servidor primero — fuente de verdad. Solo si falla usamos localStorage.
    try {
      const res = await fetch(`/api/sync?fecha=${fecha}`);
      const { ok, datos } = await res.json();
      if (ok && Array.isArray(datos)) {
        setTurnos(datos as Turno[]);
        try { localStorage.setItem(`ganesha_turnos_${fecha}`, JSON.stringify(datos)); } catch { /* silencioso */ }
        setCargandoTurnos(false);
        return;
      }
    } catch { /* sin conexión */ }
    // Fallback: localStorage solo si servidor no respondió
    try {
      const stored = localStorage.getItem(`ganesha_turnos_${fecha}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setTurnos(parsed);
      }
    } catch { /* silencioso */ }
    setCargandoTurnos(false);
  }, [fecha]);

  useEffect(() => {
    setTurnos([]);
    setCargandoTurnos(true);
    cargarTurnos();
    window.addEventListener('focus', cargarTurnos);
    const interval = setInterval(cargarTurnos, 30000);
    return () => {
      window.removeEventListener('focus', cargarTurnos);
      clearInterval(interval);
    };
  }, [cargarTurnos]);

  // ========================================
  // GASTOS DEL DÍA
  // Carga: localStorage (instante) → /api/caja GET (fuente de verdad)
  // Guarda: auto-save 1.5s a /api/caja (parcial, sin cerrar caja)
  // ========================================
  const lsGastosKey = `ganesha_gastos_${fecha}`;

  const [gastos, setGastos] = useState<Gasto[]>(() => {
    // Carga inicial desde localStorage (sincrónica — sin delay visual)
    try {
      const raw = localStorage.getItem(`ganesha_gastos_${fecha}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* silencioso */ }
    return [];
  });

  // Estado de caja — también se carga del servidor al abrir
  const [estadoCaja, setEstadoCaja] = useState<'abierta' | 'cerrada'>('abierta');
  const [guardando,  setGuardando]  = useState(false);
  const [mensaje,    setMensaje]    = useState('');

  // Snapshot histórico de gastos fijos (se carga del servidor cuando la caja está cerrada)
  // Permite mostrar los valores que existían cuando se cerró la caja, no los actuales
  const [snapshotFijosEmpresa,  setSnapshotFijosEmpresa]  = useState<GastoFijo[]>([]);
  const [snapshotFijosPersonal, setSnapshotFijosPersonal] = useState<GastoFijo[]>([]);

  // Estado visual de sincronización de gastos
  const [syncGastos, setSyncGastos] = useState<'idle' | 'guardando' | 'guardado' | 'error'>('idle');
  // Ref: bloquea auto-save hasta que el servidor respondió (evita sobrescribir con [] vacío)
  const serverCargado = useRef(false);
  // Ref: espejo del estado cerrada para closures (evita stale state en programarGuardadoGastos)
  const estadoCajaRef = useRef<'abierta' | 'cerrada'>('abierta');
  // Ref: bloquea auto-save durante el proceso de cierre (evita race condition)
  const isClosing = useRef(false);
  // Ref: timer de debounce para auto-save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref: timer para limpiar el ✓ guardado después de mostrarlo
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar gastos + estado de caja + snapshot fijos desde el servidor al montar
  useEffect(() => {
    serverCargado.current = false;
    setCargandoCaja(true);
    // Resetear estado al cambiar de fecha — evita mostrar datos del día anterior
    setEstadoCaja('abierta');
    estadoCajaRef.current = 'abierta';
    setSnapshotFijosEmpresa([]);
    setSnapshotFijosPersonal([]);
    // Cargar gastos de la nueva fecha desde localStorage (respuesta inmediata)
    try {
      const raw = localStorage.getItem(`ganesha_gastos_${fecha}`);
      const parsed = raw ? JSON.parse(raw) : null;
      setGastos(Array.isArray(parsed) ? parsed : []);
    } catch { setGastos([]); }

    fetch(`/api/caja?fecha=${fecha}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.encontrado) {
          // Servidor tiene datos: úsalos como fuente de verdad
          if (Array.isArray(data.gastos)) {
            setGastos(data.gastos);
            try { localStorage.setItem(lsGastosKey, JSON.stringify(data.gastos)); } catch { /* silencioso */ }
          }
          if (data.cerrada) {
            setEstadoCaja('cerrada');
            estadoCajaRef.current = 'cerrada';
            // Cargar snapshot histórico de gastos fijos del servidor
            // (los valores que existían cuando se cerró la caja, no los actuales)
            if (Array.isArray(data.gastosFijosEmpresa)  && data.gastosFijosEmpresa.length  > 0)
              setSnapshotFijosEmpresa(data.gastosFijosEmpresa);
            if (Array.isArray(data.gastosFijosPersonal) && data.gastosFijosPersonal.length > 0)
              setSnapshotFijosPersonal(data.gastosFijosPersonal);
          }
        }
        // Si no existe en el servidor todavía, nos quedamos con localStorage (o [])
        serverCargado.current = true;
        setCargandoCaja(false);
      })
      .catch(() => {
        // Sin conexión — quedamos con localStorage
        serverCargado.current = true;
        setCargandoCaja(false);
      });
  }, [fecha]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save gastos al servidor (parcial — no toca cerrada ni turnos)
  function programarGuardadoGastos(gastosActuales: Gasto[]) {
    if (!serverCargado.current) return;        // no guardar antes de cargar del servidor
    if (estadoCajaRef.current === 'cerrada') return; // no tocar una caja ya cerrada
    if (isClosing.current) return;             // no auto-save durante el proceso de cierre
    // Guardar en localStorage inmediatamente
    try { localStorage.setItem(lsGastosKey, JSON.stringify(gastosActuales)); } catch { /* silencioso */ }
    // Indicador visual: "guardando..."
    setSyncGastos('guardando');
    if (syncTimer.current) clearTimeout(syncTimer.current);
    // Debounce: espera 1.5s tras el último cambio para mandar al servidor
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, gastos: gastosActuales, estado: 'abierta' }),
      })
        .then(r => r.json())
        .then(data => {
          setSyncGastos(data.ok ? 'guardado' : 'error');
          // Limpiar el ✓ después de 3 segundos
          syncTimer.current = setTimeout(() => setSyncGastos('idle'), 3000);
        })
        .catch(() => {
          setSyncGastos('error');
          syncTimer.current = setTimeout(() => setSyncGastos('idle'), 4000);
        });
    }, 1500);
  }

  const agregarGasto = useCallback((gasto: Omit<Gasto, 'id' | 'timestamp'>) => {
    const nuevoGasto: Gasto = {
      ...gasto,
      id: `gasto_${Date.now()}`,
      timestamp: Date.now(),
    };
    setGastos(prev => {
      const siguiente = [...prev, nuevoGasto];
      programarGuardadoGastos(siguiente);
      return siguiente;
    });
  }, [fecha]); // eslint-disable-line react-hooks/exhaustive-deps

  const eliminarGasto = useCallback((id: string) => {
    setGastos(prev => {
      const siguiente = prev.filter(g => g.id !== id);
      programarGuardadoGastos(siguiente);
      return siguiente;
    });
  }, [fecha]); // eslint-disable-line react-hooks/exhaustive-deps

  // ========================================
  // CÁLCULOS (reactivos a turnos + gastos)
  // ========================================
  const totales = useMemo<TotalesCaja>(() => {
    const presentes = turnos.filter(t => t.asistencia === 'presente');

    // Generan ingreso: presentes + ausentes que pagaron seña (seña retenida)
    const conIngreso = turnos.filter(t =>
      t.asistencia === 'presente' ||
      (t.asistencia === 'no_vino' && (t.seña_pagada ?? 0) > 0)
    );

    // Null safety: (t.seña_pagada ?? 0) evita NaN si el campo viene undefined/null
    const seña = (t: typeof turnos[0]) => Math.max(0, t.seña_pagada ?? 0);

    const ingresos_totales = conIngreso.reduce((sum, t) => sum + seña(t), 0);
    const efectivo         = conIngreso.filter(t => t.metodo_pago === 'efectivo').reduce((sum, t) => sum + seña(t), 0);
    const transferencia    = conIngreso.filter(t => t.metodo_pago === 'transferencia').reduce((sum, t) => sum + seña(t), 0);
    // 'otro' incluye métodos no reconocidos → suma residual para que efectivo+transf+otro = ingresos_totales
    const otro             = ingresos_totales - efectivo - transferencia;
    const gastos_totales   = gastos.reduce((sum, g) => sum + Math.max(0, g.monto ?? 0), 0);

    return {
      ingresos_totales,
      gastos_totales,
      ganancia_neta:    ingresos_totales - gastos_totales,
      turnos_total:     turnos.length,
      turnos_presentes: presentes.length,
      turnos_ausentes:  turnos.filter(t => t.asistencia === 'no_vino').length,
      efectivo,
      transferencia,
      otro,
    };
  }, [turnos, gastos]);

  // ========================================
  // CIERRE DE CAJA — snapshot completo, una sola vez por día
  // gastosFijosEmpresa y gastosFijosPersonal vienen del componente padre
  // ========================================
  const cerrarYGuardar = async (
    gastosFijosEmpresa: GastoFijo[] = [],
    gastosFijosPersonal: GastoFijo[] = []
  ): Promise<boolean> => {
    setGuardando(true);
    setMensaje('');

    // Bloquear auto-save durante el cierre para evitar race condition
    isClosing.current = true;
    // Cancelar cualquier auto-save pendiente (ya vamos a hacer el save completo)
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (syncTimer.current) clearTimeout(syncTimer.current);

    try {
      const res = await fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha,
          turnos,
          gastos,
          totales,
          estado: 'cerrada',
          gastosFijosEmpresa,
          gastosFijosPersonal,
        }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        estadoCajaRef.current = 'cerrada'; // sincronizar ref antes del state
        setEstadoCaja('cerrada');
        setSyncGastos('idle');
        setMensaje(`✅ ${data.mensaje ?? 'Caja cerrada y guardada'}`);
        setGuardando(false);
        setTimeout(() => setMensaje(''), 7000);
        return true;
      } else {
        isClosing.current = false; // falló → permitir auto-save de nuevo
        setMensaje('⚠️ Error al guardar — verificá la conexión con el servidor');
        setGuardando(false);
        setTimeout(() => setMensaje(''), 7000);
        return false;
      }
    } catch {
      isClosing.current = false; // falló → permitir auto-save de nuevo
      setMensaje('⚠️ Sin conexión al servidor');
      setGuardando(false);
      setTimeout(() => setMensaje(''), 7000);
      return false;
    }
  };

  const reabrirDia = async () => {
    estadoCajaRef.current = 'abierta';
    isClosing.current = false;
    setEstadoCaja('abierta');
    // Persistir en servidor — sin esto al recargar vuelve a aparecer cerrada
    try {
      await fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, estado: 'reabrir' }),
      });
    } catch { /* silencioso — en memoria ya quedó abierta */ }
  };

  // ========================================
  // RECARGAR TODO DESDE EL SERVIDOR (turnos + gastos + estado caja)
  // Útil cuando los datos en pantalla parecen incompletos o incorrectos
  // ========================================
  const recargarDesdeServidor = async (): Promise<{ turnosRecuperados: number; gastosRecuperados: number; cerrada: boolean }> => {
    // 1. Turnos desde el sync API
    let turnosRec = 0;
    try {
      const r = await fetch(`/api/sync?fecha=${fecha}`);
      const d = await r.json();
      if (d.ok && Array.isArray(d.datos) && d.datos.length > 0) {
        setTurnos(d.datos as Turno[]);
        try { localStorage.setItem(`ganesha_turnos_${fecha}`, JSON.stringify(d.datos)); } catch { /* silencioso */ }
        turnosRec = d.datos.length;
      }
    } catch { /* sin conexión */ }

    // 2. Gastos + estado de caja desde el caja API
    let gastosRec = 0;
    let cerradaRec = false;
    try {
      const r = await fetch(`/api/caja?fecha=${fecha}`);
      const d = await r.json();
      if (d.ok && d.encontrado) {
        if (Array.isArray(d.gastos)) {
          setGastos(d.gastos);
          try { localStorage.setItem(lsGastosKey, JSON.stringify(d.gastos)); } catch { /* silencioso */ }
          gastosRec = d.gastos.length;
        }
        cerradaRec = !!d.cerrada;
        if (d.cerrada) {
          setEstadoCaja('cerrada');
          estadoCajaRef.current = 'cerrada';
        } else {
          setEstadoCaja('abierta');
          estadoCajaRef.current = 'abierta';
          isClosing.current = false;
        }
      }
    } catch { /* sin conexión */ }

    return { turnosRecuperados: turnosRec, gastosRecuperados: gastosRec, cerrada: cerradaRec };
  };

  // ========================================
  // RECUPERAR REPORTE HISTÓRICO DE POSTGRESQL
  // ========================================
  const recuperarReporte = async (fechaBuscar: string): Promise<{
    encontrado: boolean;
    turnos?: Turno[];
    gastos?: Gasto[];
    totales?: TotalesCaja;
    gastosFijosEmpresa?: GastoFijo[];
    gastosFijosPersonal?: GastoFijo[];
  }> => {
    try {
      const res = await fetch(`/api/caja?fecha=${fechaBuscar}`);
      if (!res.ok) return { encontrado: false };
      const data = await res.json();
      if (!data.ok || !data.encontrado) return { encontrado: false };
      return {
        encontrado:          true,
        turnos:              data.turnos             ?? [],
        gastos:              data.gastos             ?? [],
        totales:             data.totales,
        gastosFijosEmpresa:  data.gastosFijosEmpresa  ?? [],
        gastosFijosPersonal: data.gastosFijosPersonal ?? [],
      };
    } catch {
      return { encontrado: false };
    }
  };

  return {
    turnos,
    cargandoTurnos,
    cargandoInicial: cargandoTurnos || cargandoCaja,
    gastos,
    totales,
    estadoCaja,
    mensaje,
    guardando,
    syncGastos,      // 'idle' | 'guardando' | 'guardado' | 'error'
    agregarGasto,
    eliminarGasto,
    cerrarYGuardar,
    reabrirDia,
    cargarTurnos,
    recuperarReporte,
    recargarDesdeServidor,
    // Snapshot histórico — solo disponible cuando estadoCaja === 'cerrada'
    snapshotFijosEmpresa,
    snapshotFijosPersonal,
  };
}
