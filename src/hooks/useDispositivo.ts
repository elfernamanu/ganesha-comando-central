'use client';

import { useState, useEffect, useCallback } from 'react';

const LS_KEY = 'ganesha_device_id';

function generarId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Detecta nombre automático del dispositivo desde userAgent
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
  alias: string;         // nombre puesto por el dueño ("PC Dueña", "Celular Dueña")
  nombre: string;        // auto-detectado ("PC Windows — Chrome")
  registrado: boolean;   // true si tiene alias
  visitas: number;
  esNuevo: boolean;      // true si el servidor nunca lo vio antes
}

export function useDispositivo() {
  const [info, setInfo]         = useState<InfoDispositivo | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);

  useEffect(() => {
    let id = localStorage.getItem(LS_KEY);
    if (!id) {
      id = generarId();
      localStorage.setItem(LS_KEY, id);
    }
    const nombre = detectarNombre();

    // 1. Registrar/actualizar visita en servidor (sin tocar alias existente)
    fetch('/api/dispositivos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nombre }),
    })
      .then(r => r.json())
      .then((data: { ok: boolean; registrado?: boolean; alias?: string; visitas?: number }) => {
        setInfo({
          id,
          alias: data.alias ?? '',
          nombre,
          registrado: data.registrado ?? false,
          visitas: data.visitas ?? 1,
          esNuevo: (data.visitas ?? 1) === 1,
        });
      })
      .catch(() => {
        // Sin conexión: usar lo que hay en localStorage
        setInfo({ id, alias: localStorage.getItem('ganesha_device_alias') ?? '', nombre, registrado: false, visitas: 0, esNuevo: false });
      });
  }, []);

  const guardarAlias = useCallback(async (alias: string) => {
    const id = localStorage.getItem(LS_KEY);
    if (!id) return;
    setGuardando(true);
    try {
      const nombre = detectarNombre();
      const res = await fetch('/api/dispositivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nombre, alias }),
      });
      const data = await res.json() as { ok: boolean };
      if (data.ok) {
        localStorage.setItem('ganesha_device_alias', alias);
        setInfo(prev => prev ? { ...prev, alias, registrado: alias !== '' } : prev);
        setModalAbierto(false);
      }
    } finally {
      setGuardando(false);
    }
  }, []);

  return { info, guardando, modalAbierto, setModalAbierto, guardarAlias };
}
