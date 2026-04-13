'use client';

import { useState, useMemo, useEffect } from 'react';
import { Turno } from '../types';

/**
 * Hook para gestionar turnos del día
 */
export function useTurnos(fecha: string) {
  const [turnos, setTurnos] = useState<Turno[]>([
    // Turnos de ejemplo
    {
      id: 'turno_1',
      horario: '09:00',
      clienteNombre: 'Mariana López',
      tratamiento: 'Depilación PROMO 1',
      detalle: 'Cuerpo completo sin rostro',
      asistencia: 'presente',
      monto_total: 33000,
      seña_pagada: 5000,
      estado_pago: 'completo',
      metodo_pago: 'efectivo',
      createdAt: Date.now(),
    },
    {
      id: 'turno_2',
      horario: '10:00',
      clienteNombre: 'Sofía Giménez',
      tratamiento: 'Estética',
      detalle: 'Himfu + Criofrecuencia',
      asistencia: 'presente',
      monto_total: 15000,
      seña_pagada: 2500,
      estado_pago: 'seña',
      metodo_pago: 'efectivo',
      createdAt: Date.now(),
    },
    {
      id: 'turno_3',
      horario: '15:00',
      clienteNombre: 'Lucía Fernández',
      tratamiento: 'Uñas',
      detalle: 'Esculpidas / Soft Gel',
      asistencia: 'no_vino',
      monto_total: 12000,
      seña_pagada: 0,
      estado_pago: 'sin_pago',
      metodo_pago: 'efectivo',
      createdAt: Date.now(),
    },
  ]);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

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
