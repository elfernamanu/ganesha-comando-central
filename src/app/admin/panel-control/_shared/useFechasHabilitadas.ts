'use client';

import { useState, useEffect } from 'react';

export interface FechaHabilitada {
  fecha: string;
  servicios: string[];
}

/**
 * Hook compartido — lee jornadas activas desde config.
 * Cache en sessionStorage (60s): evita re-fetch en cada navegación dentro de la misma sesión.
 * Una sola fuente de verdad: usada en Turnos y Caja.
 */
export function useFechasHabilitadas(): FechaHabilitada[] {
  const SESSION_KEY = 'ganesha_fechas_cache';
  const CACHE_TTL   = 60_000; // 60 segundos

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

  useEffect(() => {
    // Si ya tenemos datos frescos del initializer, no re-fetch
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const { ts } = JSON.parse(raw) as { ts: number };
        if (Date.now() - ts < CACHE_TTL) return;
      }
    } catch { /* silencioso */ }

    // Fetch a servidor
    fetch('/api/admin/config', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
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

        // Guardar en sessionStorage con timestamp
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data: resultado, ts: Date.now() }));
        } catch { /* silencioso */ }
      })
      .catch(() => {});
  }, []);

  return fechas;
}
