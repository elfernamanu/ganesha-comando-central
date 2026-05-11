'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';

const LS_DEVICE_ID   = 'ganesha_device_id';
const LS_DEVICE_NAME = 'ganesha_device_name';
const HEARTBEAT_MS   = 60_000; // 1 minuto (antes 30s)

export interface Dispositivo {
  device_id: string;
  device_name: string;
  pagina: string;
  last_seen: string;
}

function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(LS_DEVICE_ID);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(LS_DEVICE_ID, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function usePresencia() {
  const pathname = usePathname();

  const [deviceId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return getOrCreateDeviceId();
  });

  const [deviceName, setDeviceNameState] = useState<string>('');
  const deviceNameRef = useRef('');

  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);

  // Cargar nombre guardado
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_DEVICE_NAME) ?? '';
      setDeviceNameState(saved);
      deviceNameRef.current = saved;
    } catch { /* silencioso */ }
  }, []);

  const setDeviceName = useCallback((name: string) => {
    const trimmed = name.trim();
    setDeviceNameState(trimmed);
    deviceNameRef.current = trimmed;
    try { localStorage.setItem(LS_DEVICE_NAME, trimmed); } catch { /* silencioso */ }
  }, []);

  const fetchDispositivos = useCallback(async () => {
    try {
      const r = await fetch('/api/presencia');
      const data = await r.json() as { ok: boolean; dispositivos: Dispositivo[] };
      if (data.ok) setDispositivos(data.dispositivos);
    } catch { /* sin conexión → sin cambios */ }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!deviceId) return;
    try {
      await fetch('/api/presencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id:   deviceId,
          device_name: deviceNameRef.current || 'Dispositivo',
          pagina:      pathname,
        }),
      });
      await fetchDispositivos();
    } catch { /* sin conexión → silencioso */ }
  }, [deviceId, pathname, fetchDispositivos]);

  // Heartbeat: solo cuando la pestaña está visible. Pausa total en background.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval !== null) return;
      sendHeartbeat();
      interval = setInterval(sendHeartbeat, HEARTBEAT_MS);
    };
    const stop = () => {
      if (interval === null) return;
      clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, [sendHeartbeat]);

  return { dispositivos, deviceId, deviceName, setDeviceName };
}
