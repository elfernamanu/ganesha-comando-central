'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Turno } from '../types';
import { leerCatalogo, type CatalogoPromos } from '../../_shared/catalogoPromos';

// ── Normaliza horario al formato HH:MM ────────────────────────────────────
// "18" → "18:00" | "9" → "09:00" | "9:3" → "09:30" | "1630" → "16:30"
function normalizarHorario(val: string): string {
  const v = (val ?? '').trim();
  if (!v) return v;
  if (/^\d{1,2}:\d{2}$/.test(v)) {
    const [h, m] = v.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }
  if (/^\d{3,4}$/.test(v)) {
    const p = v.padStart(4, '0');
    return `${p.slice(0, 2)}:${p.slice(2)}`;
  }
  if (/^\d{1,2}$/.test(v)) {
    const n = parseInt(v, 10);
    if (n >= 0 && n <= 23) return `${String(n).padStart(2, '0')}:00`;
  }
  if (/^\d{1,2}:\d$/.test(v)) {
    const [h, m] = v.split(':');
    return `${h.padStart(2, '0')}:${m}0`;
  }
  return v;
}

// ── Detección y sincronización de celular desde campo detalle ────────────
// Si la secretaria escribe un número de celular en el campo "Detalle adicional"
// del turno, se guarda automáticamente en la base de clientes.
function esNumeroCelular(str: string): boolean {
  const clean = str.trim().replace(/[\s\-\(\)\+\.]/g, '');
  return /^\d{8,15}$/.test(clean);
}

type ClienteRow = { id: string; nombre: string; celular: string; notas: string; [key: string]: unknown };

async function sincronizarCelularesDesdeDetalle(turnosList: Turno[]): Promise<Set<string>> {
  const sincronizados = new Set<string>(); // keys (nombre lowercase) que tienen celular guardado
  const candidatos = turnosList.filter(t =>
    t.clienteNombre?.trim() && t.detalle?.trim() && esNumeroCelular(t.detalle.trim())
  );
  if (candidatos.length === 0) return sincronizados;

  try {
    const resGet = await fetch('/api/clientes');
    const dataGet = await resGet.json() as { ok: boolean; datos?: ClienteRow[] };
    if (!dataGet.ok) return sincronizados;

    const byNombre = new Map((dataGet.datos ?? []).map(c => [c.nombre.toLowerCase(), { ...c }]));
    let changed = false;

    for (const t of candidatos) {
      const key = t.clienteNombre.trim().toLowerCase();
      const celularNuevo = t.detalle.trim().replace(/[\s\-\(\)\+\.]/g, '');
      const existing = byNombre.get(key);
      if (!existing?.celular || existing.celular !== celularNuevo) {
        byNombre.set(key, { ...existing, id: existing?.id ?? crypto.randomUUID(), nombre: t.clienteNombre.trim(), celular: celularNuevo, notas: existing?.notas ?? '' });
        changed = true;
      }
      sincronizados.add(key); // confirmar guardado (nuevo o ya existente)
    }

    if (changed) {
      await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos: Array.from(byNombre.values()) }) });
    }
  } catch { /* silencioso — no bloquea el guardado de turnos */ }

  return sincronizados;
}

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
  const [autoGuardado, setAutoGuardado] = useState<'idle' | 'pendiente' | 'ok' | 'error'>('idle');
  // Set de clienteNombre (lowercase) con celular sincronizado en esta sesión
  const [celularesSync, setCelularesSync] = useState<Set<string>>(new Set());
  // Ref para cancelar el auto-sync si el usuario acaba de guardar manualmente
  const ultimoGuardadoManual = useRef(0);
  // Ref para evitar auto-sync en la carga inicial (no hay cambios del usuario)
  const cargaInicialCompleta = useRef(false);
  // Ref: timestamp de la última interacción del usuario (agregar/editar/eliminar)
  // El polling/focus NO puede reemplazar el estado local durante 60 segundos
  // después de la última interacción — evita que se borre lo que están escribiendo
  const ultimaInteraccion = useRef(0);
  const PROTECCION_MS = 60_000; // 60 segundos de protección post-edición

  const lsKey = `ganesha_turnos_${fecha}`;

  const aplicarMigracion = useCallback((parsed: Turno[], catalogoExterno?: ReturnType<typeof leerCatalogo>): Turno[] => {
    const catalogo = catalogoExterno ?? leerCatalogo();
    return parsed.map(t => {
      const tratamiento = migrarTratamiento(t.tratamiento, catalogo);
      const item = catalogo[tratamiento];
      const detalle = t.detalle
        || item?.detalle
        || (item?.categoria === 'combo' ? item?.nombreDisplay : '')
        || '';
      // Normalizar horario al cargar: "18" → "18:00", "9" → "09:00", etc.
      const horario = normalizarHorario(t.horario ?? '');
      return { ...t, tratamiento, detalle, horario };
    });
  }, []);

  // Ref para cancelar fetches anteriores cuando cambia la fecha
  const abortRef = useRef<AbortController | null>(null);

  // Carga desde servidor + localStorage
  const cargarDesdeServidor = useCallback(async () => {
    try {
      const r = await fetch(`/api/sync?fecha=${fecha}`);
      const { ok, datos } = await r.json();

      if (!ok) return; // error de red/servidor → no tocar nada local

      if (!Array.isArray(datos) || datos.length === 0) {
        // Servidor vacío — solo limpiar si el usuario lleva más de 60s sin editar
        if (Date.now() - ultimaInteraccion.current < PROTECCION_MS) return;
        try { localStorage.removeItem(lsKey); } catch { /* silencioso */ }
        setTurnos([]);
        return;
      }

      // Leer catálogo UNA sola vez (compartido con migración y price-update)
      const catalogo = leerCatalogo();
      const migrados = aplicarMigracion(datos as Turno[], catalogo);

      // ── Actualización automática de precios (hoy y fechas futuras) ───────
      const d = new Date();
      const hoyStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

      let turnosFinales = migrados;
      let huboCambioPrecio = false;

      if (fecha >= hoyStr) {
        turnosFinales = migrados.map(t => {
          if (!t.tratamiento || t.tratamiento === 'Otro') return t;
          const item = catalogo[t.tratamiento];
          if (!item || item.precio === 0 || item.precio === t.monto_total) return t;
          huboCambioPrecio = true;
          const monto_total = item.precio;
          const sena = Math.min(t.seña_pagada ?? 0, monto_total);
          const estado_pago = sena === 0 ? 'sin_pago'
            : (monto_total > 0 && sena >= monto_total) ? 'completo'
            : 'seña';
          return { ...t, monto_total, seña_pagada: sena, estado_pago };
        });
        if (huboCambioPrecio) {
          fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, datos: turnosFinales }),
          }).catch(() => { /* silencioso si no hay conexión */ });
        }
      }

      // ── MERGE vs REPLACE ─────────────────────────────────────────────────
      // Si el usuario editó algo en los últimos 60s → MERGE (preservar local)
      // Si lleva más de 60s sin tocar nada → REPLACE (servidor es la fuente de verdad)
      // El auto-sync guarda al servidor en 3s, así que a los 60s el server ya tiene todo.
      const usuarioActivo = Date.now() - ultimaInteraccion.current < PROTECCION_MS;

      if (usuarioActivo && cargaInicialCompleta.current) {
        // MERGE: preservar datos y orden local, solo agregar turnos nuevos del servidor
        setTurnos(prev => {
          const prevIds = new Set(prev.map(t => t.id));
          return [
            ...prev,                                                      // local intacto
            ...turnosFinales.filter(st => !prevIds.has(st.id)),          // nuevos del server
          ];
        });
        return;
      }

      // Usuario inactivo o carga inicial → servidor manda
      // Solo ordenar en carga INICIAL (polling no reordena)
      if (!cargaInicialCompleta.current) {
        turnosFinales.sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
      }
      setTurnos(turnosFinales);
      try { localStorage.setItem(lsKey, JSON.stringify(turnosFinales)); } catch { /* silencioso */ }
    } catch { /* sin conexión — quedamos con localStorage */ }
  }, [fecha, lsKey, aplicarMigracion]);

  // Carga inicial: localStorage (instantáneo) + servidor (sync)
  useEffect(() => {
    // Cancelar fetch anterior si el usuario cambió de fecha rápido
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    cargaInicialCompleta.current = false; // nueva fecha = nueva carga
    ultimaInteraccion.current = 0;        // nueva fecha = sin interacciones previas
    setTurnos([]);           // limpiar día anterior antes de cargar nuevo
    setCelularesSync(new Set()); // limpiar ojitos del día anterior

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
  useEffect(() => {
    if (turnos.length === 0) return;
    if (!cargaInicialCompleta.current) return;
    setAutoGuardado('pendiente');
    const timer = setTimeout(async () => {
      if (Date.now() - ultimoGuardadoManual.current < 5000) return;
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fecha, datos: turnos }),
        });
        sincronizarCelularesDesdeDetalle(turnos).then(sync => {
          if (sync.size > 0) setCelularesSync(prev => { const next = new Set(prev); sync.forEach(k => next.add(k)); return next; });
        }).catch(() => {});
        setAutoGuardado('ok');
        setTimeout(() => setAutoGuardado('idle'), 3000);
      } catch {
        setAutoGuardado('error');
        setTimeout(() => setAutoGuardado('idle'), 4000);
      }
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
    // Sin turnos → arrancar a las 08:00
    if (horarios.length === 0) return '08:00';
    // Con turnos → último + 10 minutos
    const ultimo = horarios[horarios.length - 1];
    const [hStr, mStr] = ultimo.split(':');
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr, 10) + 10;
    if (m >= 60) { m -= 60; h += 1; }
    if (h >= 24) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const agregarTurno = () => {
    ultimaInteraccion.current = Date.now();
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
    setTurnos(prev =>
      [...prev, nuevoTurno].sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
    );
  };

  const actualizarTurno = (id: string, cambios: Partial<Turno>) => {
    ultimaInteraccion.current = Date.now();
    setTurnos(prev => {
      const actualizado = prev.map(t => {
        if (t.id !== id) return t;
        const updated = { ...t, ...cambios };

        if (cambios.seña_pagada !== undefined || cambios.monto_total !== undefined) {
          const total = cambios.monto_total !== undefined ? cambios.monto_total : t.monto_total;
          let seña    = cambios.seña_pagada !== undefined ? cambios.seña_pagada : t.seña_pagada;

          // Seña nunca puede superar el monto total (evita datos corruptos)
          if (total > 0 && seña > total) {
            seña = total;
            updated.seña_pagada = total;
          }

          // total > 0 evita marcar 'completo' cuando el precio aún no fue cargado
          updated.estado_pago = seña === 0 ? 'sin_pago' : (total > 0 && seña >= total) ? 'completo' : 'seña';
        }

        return updated;
      });

      // NO reordenar mientras se edita — la fila queda fija durante la carga
      // El orden se aplica solo al cargar del servidor o al agregar un turno nuevo
      return actualizado;
    });
  };

  const eliminarTurno = (id: string) => {
    ultimaInteraccion.current = Date.now();
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
      // Ordenar antes de guardar → próximo refresh carga en orden correcto
      const turnosOrdenados = [...turnos].sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha, datos: turnosOrdenados }),
      });

      if (res.ok) {
        setTurnos(turnosOrdenados);    // aplicar el orden también localmente
        sincronizarCelularesDesdeDetalle(turnosOrdenados).then(sync => {
          if (sync.size > 0) setCelularesSync(prev => { const next = new Set(prev); sync.forEach(k => next.add(k)); return next; });
        }).catch(() => {});
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
    autoGuardado,
    celularesSync,
    agregarTurno,
    actualizarTurno,
    eliminarTurno,
    guardar,
  };
}
