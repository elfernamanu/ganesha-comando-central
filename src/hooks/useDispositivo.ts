'use client';

import { useState, useEffect, useCallback } from 'react';

const LS_KEY       = 'ganesha_device_id';
const LS_ALIAS_KEY = 'ganesha_device_alias';

function generarId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function detectarNombre(): string {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  let os = 'Dispositivo';
  let browser = '';
  if (/iPhone/.test(ua))            os = 'iPhone';
  else if (/iPad/.test(ua))         os = 'iPad';
  else if (/Android/.test(ua))      os = 'Android';
  else if (/Windows/.test(ua))      os = 'PC Windows';
  else if (/Macintosh/.test(ua))    os = 'Mac';
  else if (/Linux/.test(ua))        os = 'Linux';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Firefox\//.test(ua))    browser = 'Firefox';
  else if (/Edg\//.test(ua))        browser = 'Edge';
  return browser ? `${os} — ${browser}` : os;
}

export interface InfoDispositivo {
  id: string;
  alias: string;
  nombre: string;
  registrado: boolean;
  visitas: number;
  esNuevo: boolean;
}

export type ResultadoRegistro =
  | { ok: true }
  | { ok: false; codigoInvalido: boolean; error: string };

export function useDispositivo() {
  const [info, setInfo]       = useState<InfoDispositivo | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem(LS_KEY);
    if (!id) {
      id = generarId();
      localStorage.setItem(LS_KEY, id);
    }
    const nombre = detectarNombre();

    fetch('/api/dispositivos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nombre }),
    })
      .then(r => r.json())
      .then((data: { ok: boolean; registrado?: boolean; alias?: string; visitas?: number }) => {
        const alias = data.alias ?? '';
        if (alias) localStorage.setItem(LS_ALIAS_KEY, alias);
        setInfo({
          id,
          alias,
          nombre,
          registrado: data.registrado ?? false,
          visitas: data.visitas ?? 1,
          esNuevo: (data.visitas ?? 1) === 1,
        });
      })
      .catch(() => {
        const id2 = localStorage.getItem(LS_KEY) ?? '';
        setInfo({
          id: id2,
          alias: localStorage.getItem(LS_ALIAS_KEY) ?? '',
          nombre,
          registrado: !!(localStorage.getItem(LS_ALIAS_KEY)),
          visitas: 0,
          esNuevo: false,
        });
      });
  }, []);

  // Registrar con nombre + código (requerido para dispositivos nuevos si DEVICE_CODE está configurado)
  const guardarAlias = useCallback(async (alias: string, codigoRegistro?: string): Promise<ResultadoRegistro> => {
    const id = localStorage.getItem(LS_KEY);
    if (!id) return { ok: false, codigoInvalido: false, error: 'Sin ID local' };
    setGuardando(true);
    try {
      const nombre = detectarNombre();
      const res = await fetch('/api/dispositivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nombre, alias, codigoRegistro }),
      });
      const data = await res.json() as { ok: boolean; codigoInvalido?: boolean; error?: string };
      if (data.ok) {
        localStorage.setItem(LS_ALIAS_KEY, alias);
        setInfo(prev => prev ? { ...prev, alias, registrado: alias !== '' } : prev);
        return { ok: true };
      }
      return { ok: false, codigoInvalido: data.codigoInvalido ?? false, error: data.error ?? 'Error al guardar' };
    } catch {
      return { ok: false, codigoInvalido: false, error: 'Sin conexión' };
    } finally {
      setGuardando(false);
    }
  }, []);

  return { info, guardando, guardarAlias };
}
