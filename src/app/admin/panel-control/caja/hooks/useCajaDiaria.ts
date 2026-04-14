'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Gasto } from '../types/index';
import type { Turno } from '../../_shared/turnoType';

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

  // Cargar turnos desde localStorage (secretaria los guarda ahí)
  const cargarTurnos = useCallback(() => {
    try {
      const stored = localStorage.getItem(`ganesha_turnos_${fecha}`);
      if (stored) {
        setTurnos(JSON.parse(stored));
      }
    } catch {
      // silencioso
    }
  }, [fecha]);

  useEffect(() => {
    cargarTurnos();
    // Refrescar al volver a la pestaña (secretaria puede haber actualizado turnos)
    window.addEventListener('focus', cargarTurnos);
    // También cada 30 segundos por si están en la misma pestaña
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

    // Ingresos = lo cobrado a quienes vinieron
    const ingresos_totales = presentes.reduce((sum, t) => sum + (t.seña_pagada || 0), 0);

    // Desglose por método de pago
    const efectivo      = presentes.filter(t => t.metodo_pago === 'efectivo').reduce((sum, t) => sum + (t.seña_pagada || 0), 0);
    const transferencia = presentes.filter(t => t.metodo_pago === 'transferencia').reduce((sum, t) => sum + (t.seña_pagada || 0), 0);
    const otro          = presentes.filter(t => t.metodo_pago === 'otro').reduce((sum, t) => sum + (t.seña_pagada || 0), 0);

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
  // PERSISTENCIA — guarda en servidor (interno)
  // ========================================
  const guardarEnServidor = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'actualizar_caja',
          fecha,
          turnos,
          gastos,
          totales,
          estado: 'cerrada',
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // ========================================
  // ACCIÓN PRINCIPAL — Cerrar y guardar (todo en uno)
  // ========================================
  const cerrarYGuardar = async (): Promise<boolean> => {
    setGuardando(true);
    setMensaje('');

    const ok = await guardarEnServidor();

    if (ok) {
      setEstadoCaja('cerrada');
      setMensaje('✅ Caja cerrada y guardada en servidor');
    } else {
      setMensaje('⚠️ Error al guardar — verificá la conexión');
    }

    setGuardando(false);
    setTimeout(() => setMensaje(''), 5000);
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
  }> => {
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'obtener_caja',
          fecha: fechaBuscar,
        }),
      });

      if (!res.ok) return { encontrado: false };

      const data = await res.json();
      if (!data || !data.turnos) return { encontrado: false };

      return {
        encontrado: true,
        turnos: data.turnos,
        gastos: data.gastos ?? [],
        totales: data.totales,
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
