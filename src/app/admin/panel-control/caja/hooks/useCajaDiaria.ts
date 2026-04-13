'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Gasto } from '../types/index';
import { calcularTotales } from '../utils/calculosCaja';

// Tipo que refleja exactamente lo que guarda la secretaria en Turnos
export interface TurnoSecretaria {
  id: string;
  horario: string;
  clienteNombre: string;
  tratamiento: string;
  detalle: string;
  asistencia: 'presente' | 'no_vino';
  monto_total: number;
  seña_pagada: number;
  estado_pago: 'sin_pago' | 'seña' | 'completo';
  metodo_pago: 'efectivo' | 'transferencia' | 'otro';
  createdAt: number;
}

export interface TotalesCaja {
  ingresos_totales: number;
  gastos_totales: number;
  ganancia_neta: number;
  turnos_total: number;
  turnos_presentes: number;
  turnos_ausentes: number;
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
  const [turnos, setTurnos] = useState<TurnoSecretaria[]>([]);

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
    // Refrescar cada 30 segundos por si la secretaria actualiza
    const interval = setInterval(cargarTurnos, 30000);
    return () => clearInterval(interval);
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
    // Ingresos = seña cobrada a quienes vinieron
    const ingresos_totales = turnos
      .filter(t => t.asistencia === 'presente')
      .reduce((sum, t) => sum + (t.seña_pagada || 0), 0);

    const gastos_totales = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);
    const ganancia_neta = ingresos_totales - gastos_totales;

    return {
      ingresos_totales,
      gastos_totales,
      ganancia_neta,
      turnos_total: turnos.length,
      turnos_presentes: turnos.filter(t => t.asistencia === 'presente').length,
      turnos_ausentes: turnos.filter(t => t.asistencia === 'no_vino').length,
    };
  }, [turnos, gastos]);

  // ========================================
  // PERSISTENCIA
  // ========================================
  const guardar = async () => {
    setGuardando(true);
    setMensaje('');

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
          estado: estadoCaja,
        }),
      });

      if (res.ok) {
        setMensaje('✅ Caja guardada');
      } else {
        setMensaje('⚠️ Error al guardar');
      }
    } catch {
      setMensaje('⚠️ Sin conexión');
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(''), 4000);
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
    cerrarDia,
    reabrirDia,
    cargarTurnos,
    guardar,
  };
}
