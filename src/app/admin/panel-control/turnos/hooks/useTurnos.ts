'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Turno } from '../types';
import { leerCatalogo, type CatalogoPromos } from '../../_shared/catalogoPromos';

// ── Migración de nombres viejos → nombres del catálogo actual ─────────────
function migrarTratamiento(tratamiento: string, catalogo: CatalogoPromos): string {
  if (!tratamiento) return tratamiento;
  if (catalogo[tratamiento]) return tratamiento;

  const sinPrefijo = tratamiento.replace(/^depilaci[oó]n\s+/i, '').trim();
  if (catalogo[sinPrefijo]) return sinPrefijo;

  const encontrado = Object.values(catalogo).find(item =>
    item.nombre.toLowerCase().startsWith(sinPrefijo.toLowerCase()) ||
    sinPrefijo.toLowerCase().startsWith(item.nombre.toLowerCase())
  );
  if (encontrado) return encontrado.nombre;

  return tratamiento;
}

/**
 * Hook para gestionar turnos del día
 */
export function useTurnos(fecha: string) {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  // Ref para cancelar el auto-sync si el usuario acaba de guardar manualmente
  const ultimoGuardadoManual = useRef(0);
  // Ref para evitar auto-sync en la carga inicial (no hay cambios del usuario)
  const cargaInicialCompleta = useRef(false);

  const lsKey = `ganesha_turnos_${fecha}`;

  const aplicarMigracion = useCallback((parsed: Turno[]): Turno[] => {
    const catalogo = leerCatalogo();
    return parsed.map(t => {
      const tratamiento = migrarTratamiento(t.tratamiento, catalogo);
      const item = catalogo[tratamiento];
      const detalle = t.detalle
        || item?.detalle
        || (item?.categoria === 'combo' ? item?.nombreDisplay : '')
        || '';
      return { ...t, tratamiento, detalle };
    });
  }, []);

  // Carga desde servidor + localStorage
  const cargarDesdeServidor = useCallback(async () => {
    try {
      const r = await fetch(`/api/sync?fecha=${fecha}`);
      const { ok, datos } = await r.json();

      if (!ok) return; // error de red/servidor → no tocar localStorage

      if (!Array.isArray(datos) || datos.length === 0) {
        // Servidor saludable y vacío → limpiar localStorage contaminado
        try { localStorage.removeItem(lsKey); } catch { /* silencioso */ }
        setTurnos([]);
        return;
      }

      // Servidor tiene datos → es la fuente de verdad
      const migrados = aplicarMigracion(datos as Turno[]);
      setTurnos(migrados);
      try { localStorage.setItem(lsKey, JSON.stringify(migrados)); } catch { /* silencioso */ }
    } catch { /* sin conexión — quedamos con localStorage */ }
  }, [fecha, lsKey, aplicarMigracion]);

  // Carga inicial: localStorage (instantáneo) + servidor (sync)
  useEffect(() => {
    cargaInicialCompleta.current = false; // nueva fecha = nueva carga
    setTurnos([]); // limpiar día anterior antes de cargar nuevo

    // 1. localStorage primero (respuesta inmediata)
    try {
      const stored = localStorage.getItem(lsKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Turno[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTurnos(aplicarMigracion(parsed));
        }
      }
    } catch { /* silencioso */ }

    // 2. Servidor (fuente de verdad) — cuando termina, marcamos carga completa
    cargarDesdeServidor().finally(() => {
      cargaInicialCompleta.current = true;
    });
  }, [fecha]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling cada 30s + recarga al volver al foco → celular y PC sincronizados
  useEffect(() => {
    const interval = setInterval(cargarDesdeServidor, 30000);
    window.addEventListener('focus', cargarDesdeServidor);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', cargarDesdeServidor);
    };
  }, [cargarDesdeServidor]);

  // Auto-sync a localStorage (para Caja)
  useEffect(() => {
    try {
      localStorage.setItem(lsKey, JSON.stringify(turnos));
    } catch { /* silencioso */ }
  }, [turnos, lsKey]);

  // Auto-sync al servidor 3s después del último cambio DEL USUARIO
  // (no dispara en carga inicial ni cuando el usuario acaba de guardar manualmente)
  useEffect(() => {
    if (turnos.length === 0) return;
    if (!cargaInicialCompleta.current) return; // no auto-sync durante carga inicial
    const timer = setTimeout(() => {
      // Si hubo un guardado manual en los últimos 5s, no re-enviar
      if (Date.now() - ultimoGuardadoManual.current < 5000) return;
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
      horario: proximoHorario(),
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

        if (cambios.seña_pagada !== undefined || cambios.monto_total !== undefined) {
          const seña  = cambios.seña_pagada !== undefined ? cambios.seña_pagada : t.seña_pagada;
          const total = cambios.monto_total !== undefined ? cambios.monto_total : t.monto_total;
          updated.estado_pago = seña === 0 ? 'sin_pago' : seña >= total ? 'completo' : 'seña';
        }

        return updated;
      });

      if (cambios.horario !== undefined) {
        return [...actualizado].sort((a, b) => {
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
    const ingresos = turnos
      .filter(t => t.asistencia === 'presente' || (t.asistencia === 'no_vino' && t.seña_pagada > 0))
      .reduce((sum, t) => sum + t.seña_pagada, 0);

    return {
      total_turnos: turnos.length,
      asistencias: turnos.filter(t => t.asistencia === 'presente').length,
      ausentes:    turnos.filter(t => t.asistencia === 'no_vino').length,
      ingresos_seña: ingresos,
    };
  }, [turnos]);

  // ========================================
  // GUARDAR (manual — con validación de precios)
  // ========================================
  const guardar = async () => {
    setGuardando(true);
    setMensaje('');

    const catalogo = leerCatalogo();
    const erroresPrecios: string[] = [];

    turnos.forEach(t => {
      if (!t.tratamiento || t.tratamiento === 'Otro') return;
      const item = catalogo[t.tratamiento];
      if (!item || item.precio === 0) return;
      if (t.monto_total !== item.precio) {
        erroresPrecios.push(
          `"${t.tratamiento}" → esperado $${item.precio.toLocaleString('es-AR')}, tiene $${t.monto_total.toLocaleString('es-AR')} (${t.clienteNombre || 'sin nombre'})`
        );
      }
    });

    if (erroresPrecios.length > 0) {
      setMensaje(`⛔ Precio incorrecto:\n${erroresPrecios.join('\n')}`);
      setGuardando(false);
      return;
    }

    try {
      ultimoGuardadoManual.current = Date.now(); // cancelar auto-sync duplicado
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, datos: turnos }),
      });

      if (res.ok) {
        setMensaje('✅ Guardado — visible en todos los dispositivos');
      } else {
        setMensaje('⚠️ Error al guardar en servidor');
      }
    } catch {
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
