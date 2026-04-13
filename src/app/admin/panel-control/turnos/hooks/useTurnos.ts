'use client';

import { useState, useMemo, useEffect } from 'react';
import { Turno } from '../types';

/**
 * Hook para gestionar turnos del día
 */
export function useTurnos(fecha: string) {
  // Inicia vacío — se carga desde localStorage en el useEffect
  const [turnos, setTurnos] = useState<Turno[]>([]);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Cargar turnos guardados de este día al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`ganesha_turnos_${fecha}`);
      if (stored) {
        const parsed = JSON.parse(stored) as Turno[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTurnos(parsed);
        }
      }
    } catch {
      // silencioso
    }
  }, [fecha]);

  // Auto-sync a localStorage para que Caja pueda leer los datos
  useEffect(() => {
    try {
      localStorage.setItem(`ganesha_turnos_${fecha}`, JSON.stringify(turnos));
    } catch {
      // silencioso si localStorage no disponible
    }
  }, [turnos, fecha]);

  // ========================================
  // ACCIONES
  // ========================================
  const agregarTurno = () => {
    const nuevoTurno: Turno = {
      id: `turno_${Date.now()}`,
      horario: '',
      clienteNombre: '',
      tratamiento: 'Depilación PROMO 1',
      detalle: '',
      asistencia: 'presente',
      monto_total: 0,
      seña_pagada: 0,
      estado_pago: 'sin_pago',
      metodo_pago: 'efectivo',
      createdAt: Date.now(),
    };
    setTurnos(prev => [...prev, nuevoTurno]);
  };

  const actualizarTurno = (id: string, cambios: Partial<Turno>) => {
    setTurnos(prev =>
      prev.map(t => {
        if (t.id === id) {
          const updated = { ...t, ...cambios };

          // Si cambian los montos, actualizar estado_pago automáticamente
          if (cambios.seña_pagada !== undefined || cambios.monto_total !== undefined) {
            const seña = cambios.seña_pagada !== undefined ? cambios.seña_pagada : t.seña_pagada;
            const total = cambios.monto_total !== undefined ? cambios.monto_total : t.monto_total;

            if (seña === 0) {
              updated.estado_pago = 'sin_pago';
            } else if (seña >= total) {
              updated.estado_pago = 'completo';
            } else {
              updated.estado_pago = 'seña';
            }
          }

          return updated;
        }
        return t;
      })
    );
  };

  const eliminarTurno = (id: string) => {
    setTurnos(prev => prev.filter(t => t.id !== id));
  };

  // ========================================
  // CÁLCULOS
  // ========================================
  const totales = useMemo(() => {
    const ingresos = turnos
      .filter(t => t.asistencia === 'presente')
      .reduce((sum, t) => sum + t.seña_pagada, 0);

    const ausentes = turnos.filter(t => t.asistencia === 'no_vino').length;

    return {
      total_turnos: turnos.length,
      asistencias: turnos.filter(t => t.asistencia === 'presente').length,
      ausentes,
      ingresos_seña: ingresos,
    };
  }, [turnos]);

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
          accion: 'actualizar_turnos',
          fecha,
          turnos,
        }),
      });

      if (res.ok) {
        setMensaje('✅ Turnos guardados');
      } else {
        setMensaje('⚠️ Error al guardar');
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje('⚠️ Sin conexión');
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  return {
    turnos,
    totales,
    mensaje,
    guardando,
    agregarTurno,
    actualizarTurno,
    eliminarTurno,
    guardar,
  };
}
