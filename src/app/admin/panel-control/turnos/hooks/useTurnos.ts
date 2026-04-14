'use client';

import { useState, useMemo, useEffect } from 'react';
import { Turno } from '../types';
import { leerCatalogo, type CatalogoPromos } from '../../_shared/catalogoPromos';

// ── Migración de nombres viejos → nombres del catálogo actual ─────────────
// Ej: "Depilación PROMO 1" → "PROMO 1: Rostro completo (Mujer)"
//     "Uñas"               → se deja como está (genérico válido)
function migrarTratamiento(tratamiento: string, catalogo: CatalogoPromos): string {
  if (!tratamiento) return tratamiento;
  // Ya existe en el catálogo → OK
  if (catalogo[tratamiento]) return tratamiento;

  // Intento 1: quitar prefijo "Depilación " y buscar lo que queda
  const sinPrefijo = tratamiento.replace(/^depilaci[oó]n\s+/i, '').trim();
  if (catalogo[sinPrefijo]) return sinPrefijo;

  // Intento 2: buscar un item del catálogo que comience con el texto limpio
  const encontrado = Object.values(catalogo).find(item =>
    item.nombre.toLowerCase().startsWith(sinPrefijo.toLowerCase()) ||
    sinPrefijo.toLowerCase().startsWith(item.nombre.toLowerCase())
  );
  if (encontrado) return encontrado.nombre;

  // Sin match → lo dejamos como está (la secretaria lo cambia a mano)
  return tratamiento;
}

/**
 * Hook para gestionar turnos del día
 */
export function useTurnos(fecha: string) {
  // Inicia vacío — se carga desde localStorage en el useEffect
  const [turnos, setTurnos] = useState<Turno[]>([]);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Carga turnos: primero localStorage (rápido), luego servidor (sync entre dispositivos)
  useEffect(() => {
    const catalogo = leerCatalogo();

    function aplicarMigracion(parsed: Turno[]): Turno[] {
      return parsed.map(t => {
        const tratamiento = migrarTratamiento(t.tratamiento, catalogo);
        const item = catalogo[tratamiento];
        const detalle = t.detalle
          || item?.detalle
          || (item?.categoria === 'combo' ? item?.nombreDisplay : '')
          || '';
        return { ...t, tratamiento, detalle };
      });
    }

    // 1. Cargar localStorage primero (inmediato, sin esperar red)
    try {
      const stored = localStorage.getItem(`ganesha_turnos_${fecha}`);
      if (stored) {
        const parsed = JSON.parse(stored) as Turno[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTurnos(aplicarMigracion(parsed));
        }
      }
    } catch { /* silencioso */ }

    // 2. En background, cargar del servidor (sincroniza entre celular y PC)
    fetch(`/api/sync?fecha=${fecha}`)
      .then(r => r.json())
      .then(({ ok, datos }) => {
        if (!ok || !Array.isArray(datos) || datos.length === 0) return;
        const migrados = aplicarMigracion(datos as Turno[]);
        // El servidor es fuente de verdad: reemplaza localStorage
        setTurnos(migrados);
        try {
          localStorage.setItem(`ganesha_turnos_${fecha}`, JSON.stringify(migrados));
        } catch { /* silencioso */ }
      })
      .catch(() => { /* sin conexión — quedamos con localStorage */ });
  }, [fecha]);

  // Auto-sync a localStorage para que Caja pueda leer los datos
  useEffect(() => {
    try {
      localStorage.setItem(`ganesha_turnos_${fecha}`, JSON.stringify(turnos));
    } catch { /* silencioso */ }
  }, [turnos, fecha]);

  // Auto-sync al servidor (3s después del último cambio) → sincroniza celular ↔ PC
  useEffect(() => {
    if (turnos.length === 0) return;
    const timer = setTimeout(() => {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, datos: turnos }),
      }).catch(() => { /* silencioso si no hay conexión */ });
    }, 3000);
    return () => clearTimeout(timer);
  }, [turnos, fecha]);

  // ========================================
  // ACCIONES
  // ========================================
  // Calcula el próximo horario: último turno + 15 minutos
  const proximoHorario = (): string => {
    const horarios = turnos
      .map(t => t.horario)
      .filter(h => /^\d{1,2}:\d{2}$/.test(h))
      .sort();
    if (horarios.length === 0) return '';
    const ultimo = horarios[horarios.length - 1];
    const [hStr, mStr] = ultimo.split(':');
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr, 10) + 10;
    if (m >= 60) { m -= 60; h += 1; }
    if (h >= 24) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const agregarTurno = () => {
    const nuevoTurno: Turno = {
      id: `turno_${Date.now()}`,
      horario: proximoHorario(),   // último + 15 min, vacío si es el primero
      clienteNombre: '',
      tratamiento: '',
      detalle: '',
      asistencia: '',
      monto_total: 0,
      seña_pagada: 0,
      estado_pago: 'sin_pago',
      metodo_pago: 'efectivo',
      createdAt: Date.now(),
    };
    setTurnos(prev => [...prev, nuevoTurno]);
  };

  const actualizarTurno = (id: string, cambios: Partial<Turno>) => {
    setTurnos(prev => {
      const actualizado = prev.map(t => {
        if (t.id !== id) return t;
        const updated = { ...t, ...cambios };

        // Recalcular estado_pago si cambian los montos
        if (cambios.seña_pagada !== undefined || cambios.monto_total !== undefined) {
          const seña  = cambios.seña_pagada !== undefined ? cambios.seña_pagada : t.seña_pagada;
          const total = cambios.monto_total !== undefined ? cambios.monto_total : t.monto_total;
          updated.estado_pago = seña === 0 ? 'sin_pago' : seña >= total ? 'completo' : 'seña';
        }

        return updated;
      });

      // Si cambió el horario → reordenar la lista automáticamente
      if (cambios.horario !== undefined) {
        return [...actualizado].sort((a, b) => {
          // Horarios vacíos van al final
          if (!a.horario) return 1;
          if (!b.horario) return -1;
          return a.horario.localeCompare(b.horario);
        });
      }

      return actualizado;
    });
  };

  const eliminarTurno = (id: string) => {
    setTurnos(prev => prev.filter(t => t.id !== id));
  };

  // ========================================
  // CÁLCULOS
  // ========================================
  const totales = useMemo(() => {
    // Ingresos = presentes cobrados + ausentes que dejaron seña (la pierden)
    const ingresos = turnos
      .filter(t => t.asistencia === 'presente' || (t.asistencia === 'no_vino' && t.seña_pagada > 0))
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

    // ── Validación de precios contra catálogo ──────────────────────────
    // Si algún turno tiene precio diferente al configurado en Servicios → bloquear
    const catalogo = leerCatalogo();
    const erroresPrecios: string[] = [];

    turnos.forEach(t => {
      if (!t.tratamiento || t.tratamiento === 'Otro') return;
      const item = catalogo[t.tratamiento];
      if (!item || item.precio === 0) return; // sin precio configurado → OK
      if (t.monto_total !== item.precio) {
        erroresPrecios.push(
          `"${t.tratamiento}" → esperado $${item.precio.toLocaleString('es-AR')}, tiene $${t.monto_total.toLocaleString('es-AR')} (${t.clienteNombre || 'sin nombre'})`
        );
      }
    });

    if (erroresPrecios.length > 0) {
      setMensaje(`⛔ Precio incorrecto:\n${erroresPrecios.join('\n')}`);
      setGuardando(false);
      return; // NO enviamos al webhook hasta que estén bien
    }
    // ──────────────────────────────────────────────────────────────────

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, datos: turnos }),
      });

      if (res.ok) {
        setMensaje('✅ Turnos guardados — visibles en todos los dispositivos');
      } else {
        setMensaje('⚠️ Error al guardar en servidor');
      }
    } catch (error) {
      console.error('Error:', error);
      setMensaje('⚠️ Sin conexión — guardado solo en este dispositivo');
    } finally {
      setGuardando(false);
      setTimeout(() => setMensaje(''), 5000);
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
