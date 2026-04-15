'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
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
  // Desglose por método de pago (solo presentes)
  efectivo: number;
  transferencia: number;
  otro: number;
}

/**
 * Hook principal de Caja Diaria
 * - Lee turnos desde localStorage (escritos por la secretaria en /turnos)
 * - Gestiona gastos del día
 * - Calcula totales: ingresos, gastos, ganancia
 */
export function useCajaDiaria(fecha: string) {
  // ========================================
  // TURNOS (solo lectura — escritos por secretaria)
  // ========================================
  const [turnos, setTurnos] = useState<Turno[]>([]);

  // Cargar turnos: localStorage primero, luego servidor (sincroniza entre dispositivos)
  const cargarTurnos = useCallback(async () => {
    // 1. Primero localStorage (inmediato)
    try {
      const stored = localStorage.getItem(`ganesha_turnos_${fecha}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTurnos(parsed);
        }
      }
    } catch { /* silencioso */ }

    // 2. Luego servidor (fuente de verdad — tiene lo que guardó la secretaria)
    try {
      const res = await fetch(`/api/sync?fecha=${fecha}`);
      const { ok, datos } = await res.json();
      if (ok && Array.isArray(datos) && datos.length > 0) {
        setTurnos(datos as Turno[]);
        // Actualizar localStorage con los datos del servidor
        try {
          localStorage.setItem(`ganesha_turnos_${fecha}`, JSON.stringify(datos));
        } catch { /* silencioso */ }
      }
    } catch { /* sin conexión — quedamos con localStorage */ }
  }, [fecha]);

  useEffect(() => {
    cargarTurnos();
    // Refrescar al volver a la pestaña
    window.addEventListener('focus', cargarTurnos);
    // También cada 30 segundos
    const interval = setInterval(cargarTurnos, 30000);
    return () => {
      window.removeEventListener('focus', cargarTurnos);
      clearInterval(interval);
    };
  }, [cargarTurnos]);

  // ========================================
  // GASTOS (solo dueña — no secretaria)
  // ========================================
  const [gastos, setGastos] = useState<Gasto[]>([]);

  const agregarGasto = (gasto: Omit<Gasto, 'id' | 'timestamp'>) => {
    const nuevoGasto: Gasto = {
      ...gasto,
      id: `gasto_${Date.now()}`,
      timestamp: Date.now(),
    };
    setGastos(prev => [...prev, nuevoGasto]);
  };

  const eliminarGasto = (id: string) => {
    setGastos(prev => prev.filter(g => g.id !== id));
  };

  // ========================================
  // ESTADO DE CAJA
  // ========================================
  const [estadoCaja, setEstadoCaja] = useState<'abierta' | 'cerrada'>('abierta');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cerrarDia = () => setEstadoCaja('cerrada');
  const reabrirDia = () => setEstadoCaja('abierta');

  // ========================================
  // CÁLCULOS
  // ========================================
  const totales = useMemo<TotalesCaja>(() => {
    const presentes = turnos.filter(t => t.asistencia === 'presente');

    // Ingresos = presentes + ausentes con seña (la pierden → es ganancia del negocio)
    const conIngreso = turnos.filter(t =>
      t.asistencia === 'presente' ||
      (t.asistencia === 'no_vino' && (t.seña_pagada || 0) > 0)
    );

    const ingresos_totales = conIngreso.reduce((sum, t) => sum + (t.seña_pagada || 0), 0);

    // Desglose por método de pago (incluye seña perdida de ausentes)
    const efectivo      = conIngreso.filter(t => t.metodo_pago === 'efectivo').reduce((sum, t) => sum + (t.seña_pagada || 0), 0);
    const transferencia = conIngreso.filter(t => t.metodo_pago === 'transferencia').reduce((sum, t) => sum + (t.seña_pagada || 0), 0);
    const otro          = conIngreso.filter(t => t.metodo_pago === 'otro').reduce((sum, t) => sum + (t.seña_pagada || 0), 0);

    const gastos_totales = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
    const ganancia_neta  = ingresos_totales - gastos_totales;

    return {
      ingresos_totales,
      gastos_totales,
      ganancia_neta,
      turnos_total:     turnos.length,
      turnos_presentes: presentes.length,
      turnos_ausentes:  turnos.filter(t => t.asistencia === 'no_vino').length,
      efectivo,
      transferencia,
      otro,
    };
  }, [turnos, gastos]);

  // ========================================
  // PERSISTENCIA — guarda directo en PostgreSQL via /api/caja
  // gastosFijosEmpresa y gastosFijosPersonal se incluyen como snapshot histórico
  // ========================================
  const guardarEnServidor = async (
    gastosFijosEmpresa: GastoFijo[] = [],
    gastosFijosPersonal: GastoFijo[] = []
  ): Promise<{ ok: boolean; mensaje?: string }> => {
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
          gastosFijosEmpresa,   // snapshot del estado en el momento del cierre
          gastosFijosPersonal,
        }),
      });
      const data = await res.json();
      return { ok: res.ok && data.ok, mensaje: data.mensaje };
    } catch {
      return { ok: false };
    }
  };

  // ========================================
  // ACCIÓN PRINCIPAL — Cerrar y guardar (todo en uno)
  // Recibe los gastos fijos del componente padre (Caja page)
  // ========================================
  const cerrarYGuardar = async (
    gastosFijosEmpresa: GastoFijo[] = [],
    gastosFijosPersonal: GastoFijo[] = []
  ): Promise<boolean> => {
    setGuardando(true);
    setMensaje('');

    const { ok, mensaje } = await guardarEnServidor(gastosFijosEmpresa, gastosFijosPersonal);

    if (ok) {
      setEstadoCaja('cerrada');
      setMensaje(`✅ ${mensaje ?? 'Caja cerrada y guardada'}`);
    } else {
      setMensaje('⚠️ Error al guardar — verificá la conexión con el servidor');
    }

    setGuardando(false);
    setTimeout(() => setMensaje(''), 7000);
    return ok;
  };

  // ========================================
  // RECUPERAR REPORTE DE POSTGRESQL
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
        totales:             data.totales,                    // siempre llega del servidor (nunca null)
        gastosFijosEmpresa:  data.gastosFijosEmpresa  ?? [],
        gastosFijosPersonal: data.gastosFijosPersonal ?? [],
      };
    } catch {
      return { encontrado: false };
    }
  };

  return {
    // Datos
    turnos,
    gastos,
    totales,
    estadoCaja,
    mensaje,
    guardando,

    // Acciones gastos
    agregarGasto,
    eliminarGasto,

    // Acciones caja
    cerrarYGuardar,
    reabrirDia,
    cargarTurnos,
    recuperarReporte,
  };
}
