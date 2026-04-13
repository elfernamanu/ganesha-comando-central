'use client';

import { useState, useMemo } from 'react';
import { CajaDiaria, Turno, Gasto, Totales } from '../types/index';
import { calcularTotales } from '../utils/calculosCaja';

/**
 * Hook principal para gestionar la caja diaria
 * Maneja: turnos, gastos, cálculos y persistencia
 */
export function useCajaDiaria(fecha: string) {
  // ========================================
  // STATE
  // ========================================
  const [caja, setCaja] = useState<CajaDiaria>({
    fecha,
    turnos: [
      // Turnos de ejemplo para testing
      {
        id: 'turno_1',
        clienteNombre: 'Mariana López',
        servicios: ['Depilación PROMO 1'],
        monto_total: 33000,
        senia_requerida: 5000,
        estado: 'seña_pagada',
        senia_pagada: 5000,
        monto_pagado: 33000,
        metodo_pago: 'efectivo',
        horario: '09:00',
        createdAt: Date.now(),
      },
      {
        id: 'turno_2',
        clienteNombre: 'Lucía Fernández',
        servicios: ['Uñas', 'Depilación PROMO 1'],
        monto_total: 45000,
        senia_requerida: 7000,
        estado: 'sin_seña',
        senia_pagada: 0,
        monto_pagado: 0,
        metodo_pago: 'efectivo',
        horario: '15:00',
        createdAt: Date.now(),
      },
      {
        id: 'turno_3',
        clienteNombre: 'Sofía Giménez',
        servicios: ['Estética'],
        monto_total: 15000,
        senia_requerida: 2500,
        estado: 'ausente',
        senia_pagada: 0,
        monto_pagado: 0,
        metodo_pago: 'efectivo',
        horario: '14:00',
        createdAt: Date.now(),
      },
    ],
    gastos: [
      {
        id: 'gasto_1',
        concepto: 'Alquiler del local',
        monto: 15000,
        categoria: 'alquiler',
        timestamp: Date.now(),
      },
      {
        id: 'gasto_2',
        concepto: 'Luz',
        monto: 2500,
        categoria: 'servicios',
        timestamp: Date.now(),
      },
    ],
    estado: 'abierta',
    createdAt: Date.now(),
  });

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // ========================================
  // ACCIONES - TURNOS
  // ========================================
  const agregarTurno = (turno: Omit<Turno, 'id' | 'createdAt'>) => {
    const nuevoTurno: Turno = {
      ...turno,
      id: `turno_${Date.now()}`,
      createdAt: Date.now(),
    };
    setCaja(prev => ({
      ...prev,
      turnos: [...prev.turnos, nuevoTurno],
    }));
  };

  const actualizarTurno = (id: string, cambios: Partial<Turno>) => {
    setCaja(prev => ({
      ...prev,
      turnos: prev.turnos.map(t => (t.id === id ? { ...t, ...cambios } : t)),
    }));
  };

  const eliminarTurno = (id: string) => {
    setCaja(prev => ({
      ...prev,
      turnos: prev.turnos.filter(t => t.id !== id),
    }));
  };

  // ========================================
  // ACCIONES - GASTOS
  // ========================================
  const agregarGasto = (gasto: Omit<Gasto, 'id' | 'timestamp'>) => {
    const nuevoGasto: Gasto = {
      ...gasto,
      id: `gasto_${Date.now()}`,
      timestamp: Date.now(),
    };
    setCaja(prev => ({
      ...prev,
      gastos: [...prev.gastos, nuevoGasto],
    }));
  };

  const eliminarGasto = (id: string) => {
    setCaja(prev => ({
      ...prev,
      gastos: prev.gastos.filter(g => g.id !== id),
    }));
  };

  // ========================================
  // ACCIONES - CAJA
  // ========================================
  const cerrarDia = () => {
    setCaja(prev => ({ ...prev, estado: 'cerrada' }));
  };

  const reabrirDia = () => {
    setCaja(prev => ({ ...prev, estado: 'abierta' }));
  };

  // ========================================
  // CÁLCULOS
  // ========================================
  const totales = useMemo<Totales>(() => {
    return calcularTotales(caja.turnos, caja.gastos);
  }, [caja.turnos, caja.gastos]);

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
          caja: {
            ...caja,
            ...totales,
          },
        }),
      });

      if (res.ok) {
        setMensaje('✅ Guardado — Los datos están en PostgreSQL');
      } else {
        setMensaje('⚠️ Error — Revisá n8n');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setMensaje('⚠️ Sin conexión al servidor');
    } finally {
      setGuardando(false);
      // Limpiar mensaje después de 4 segundos
      setTimeout(() => setMensaje(''), 4000);
    }
  };

  // ========================================
  // RETORNO
  // ========================================
  return {
    // Estado
    caja,
    totales,
    mensaje,
    guardando,

    // Acciones de turnos
    agregarTurno,
    actualizarTurno,
    eliminarTurno,

    // Acciones de gastos
    agregarGasto,
    eliminarGasto,

    // Acciones de caja
    cerrarDia,
    reabrirDia,

    // Persistencia
    guardar,
  };
}
