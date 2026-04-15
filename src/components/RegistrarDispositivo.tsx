'use client';

/**
 * RegistrarDispositivo — se monta en el root layout (invisible)
 * Detecta el dispositivo, genera un ID único, y lo registra en PostgreSQL.
 * Así la dueña puede ver desde qué máquinas/celulares se usa la app.
 */
import { useEffect } from 'react';

// ── Detecta nombre legible del dispositivo desde el userAgent ─────────────────
function detectarNombre(): string {
  const ua = navigator.userAgent;

  let tipo = 'PC';
  if (/iPhone/.test(ua))                tipo = '📱 iPhone';
  else if (/iPad/.test(ua))             tipo = '📱 iPad';
  else if (/Android.*Mobile/.test(ua))  tipo = '📱 Android';
  else if (/Android/.test(ua))          tipo = '📱 Tablet Android';
  else if (/Macintosh/.test(ua))        tipo = '💻 Mac';
  else if (/Windows/.test(ua))          tipo = '🖥️ PC Windows';
  else if (/Linux/.test(ua))            tipo = '🖥️ Linux';

  let navegador = '';
  if (/Edg\//.test(ua))                 navegador = 'Edge';
  else if (/Chrome\//.test(ua))         navegador = 'Chrome';
  else if (/Firefox\//.test(ua))        navegador = 'Firefox';
  else if (/Safari\//.test(ua))         navegador = 'Safari';
  else if (/OPR\/|Opera\//.test(ua))    navegador = 'Opera';

  return navegador ? `${tipo} — ${navegador}` : tipo;
}

// ── ID único por dispositivo guardado en localStorage ────────────────────────
function obtenerDeviceId(): string {
  const key = 'ganesha_device_id';
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return `dev_tmp_${Date.now()}`;
  }
}

export default function RegistrarDispositivo() {
  useEffect(() => {
    // Solo registrar una vez por sesión (evita POST en cada render)
    const sessionKey = 'ganesha_device_registered';
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, '1');

    const id     = obtenerDeviceId();
    const nombre = detectarNombre();

    fetch('/api/dispositivos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nombre }),
    }).catch(() => { /* silencioso — no crítico */ });
  }, []);

  return null; // componente invisible
}
