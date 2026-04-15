'use client';

import { useState, useEffect, useCallback } from 'react';

export interface FechaHabilitada {
  fecha: string;
  servicios: string[];
}

/**
 * Hook compartido — lee jornadas activas desde config.
 * Cache en sessionStorage (10s): respuesta visual inmediata sin re-fetch por cada render.
 * Recarga automáticamente al volver al foco de la ventana.
 * Una sola fuente de verdad: usada en Turnos y Caja.
 */
export function useFechasHabilitadas(): FechaHabilitada[] {
  const SESSION_KEY = 'ganesha_fechas_cache';
  const CACHE_TTL   = 10_000; // 10 segundos — actualiza rápido al agregar fechas

  const [fechas, setFechas] = useState<FechaHabilitada[]>(() => {
    // Intentar leer caché sincrónico en la inicialización (evita flash vacío)
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const { data, ts } = JSON.parse(raw) as { data: FechaHabilitada[]; ts: number };
        if (Date.now() - ts < CACHE_TTL) return data;
      }
    } catch { /* silencioso */ }
    return [];
  });

  const fetchFechas = useCallback(async () => {
    // Si el caché es fresco, no re-fetch
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const { ts } = JSON.parse(raw) as { ts: number };
        if (Date.now() - ts < CACHE_TTL) return;
      }
    } catch { /* silencioso */ }

    try {
      const r = await fetch('/api/admin/config', { cache: 'no-store' });
      const data = await r.json();
      if (!data.ok || !Array.isArray(data.datos)) return;

      const mapa: Record<string, string[]> = {};
      for (const cat of data.datos) {
        for (const j of (cat.jornadas ?? [])) {
          if (j.activa) {
            if (!mapa[j.fecha]) mapa[j.fecha] = [];
            mapa[j.fecha].push(cat.nombre);
          }
        }
      }
      const resultado: FechaHabilitada[] = Object.entries(mapa)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, servicios]) => ({ fecha, servicios }));

      setFechas(resultado);

      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data: resultado, ts: Date.now() }));
      } catch { /* silencioso */ }
    } catch { /* sin conexión — nos quedamos con lo que hay */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchFechas();
    // Al volver al foco (celular o PC): re-fetch para ver fechas recién agregadas
    window.addEventListener('focus', fetchFechas);
    return () => window.removeEventListener('focus', fetchFechas);
  }, [fetchFechas]);

  return fechas;
}
