'use client';

import { useState, useMemo } from 'react';
import { MovimientoCaja, ResumenCaja } from '../types';

/**
 * Hook para gestionar la caja diaria
 * Genera movimientos desde turnos y permite agregar ganancia extra
 */
export function useCaja(fecha: string, turnoData?: any[]) {
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([
    // Ejemplo de movimientos generados desde turnos
    {
      id: 'mov_1',
      clienteNombre: 'Mariana López',
      tipo: 'cobro',
      descripcion: 'Depilación PROMO 1',
      monto: 33000,
      metodo_pago: 'efectivo',
      timestamp: Date.now(),
      turnoId: 'turno_1',
    },
    {
      id: 'mov_2',
      clienteNombre: 'Sofía Giménez',
      tipo: 'seña',
      descripcion: 'Estética',
      monto: 2500,
      metodo_pago: 'efectivo',
      timestamp: Date.now(),
      turnoId: 'turno_2',
    },
  ]);

  const [gananciaConcepto, setGananciaConcepto] = useState('');
  const [ganancia Monto, setGanancia Monto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // ========================================
  // ACCIONES
  // ========================================
  const agregarGananciaExtra = () => {
    if (!gananciaConcepto.trim() || !ganancia Monto.trim()) {
      alert('Completa concepto y monto');
      return;
    }

    const monto = parseInt(ganancia Monto.replace(/\D/g, '')) || 0;
    if (monto <= 0) {
      alert('Monto debe ser mayor a 0');
      return;
    }

    const nuevoMovimiento: MovimientoCaja = {
      id: `ganancia_${Date.now()}`,
      clienteNombre: gananciaConcepto,
      tipo: 'ganancia_extra',
      descripcion: `Ganancia: ${gananciaConcepto}`,
      monto,
      metodo_pago: 'efectivo',
      timestamp: Date.now(),
    };

    setMovimientos(prev => [...prev, nuevoMovimiento]);
    setGananciaConcepto('');
    setGanancia Monto('');
  };

  const eliminarMovimiento = (id: string) => {
    setMovimientos(prev => prev.filter(m => m.id !== id));
  };

  const actualizarMovimiento = (id: string, cambios: Partial<MovimientoCaja>) => {
    setMovimientos(prev =>
      prev.map(m => (m.id === id ? { ...m, ...cambios } : m))
    );
  };

  // ========================================
  // CÁLCULOS
  // ========================================
  const resumen = useMemo<ResumenCaja>(() => {
    const total_ingresos = movimientos.reduce((sum, m) => sum + m.monto, 0);

    return {
      fecha,
      movimientos,
      total_ingresos,
      total_gastos: 0,
      ganancia_neta: total_ingresos,
    };
  }, [movimientos, fecha]);

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
          resumen,
        }),
      });

      if (res.ok) {
        setMensaje('✅ Caja guardada');
      } else {
        setMensaje('⚠️ Error');
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
    resumen,
    movimientos,
    gananciaConcepto,
    ganancia Monto,
    mensaje,
    guardando,
    setGananciaConcepto,
    setGanancia Monto,
    agregarGananciaExtra,
    eliminarMovimiento,
    actualizarMovimiento,
    guardar,
  };
}
