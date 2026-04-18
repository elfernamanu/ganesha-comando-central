'use client';

import { useState, useEffect } from 'react';

const LS_KEY       = 'ganesha_device_id';
const LS_ALIAS_KEY = 'ganesha_device_alias';

/**
 * Hook rápido para verificar si el dispositivo actual está registrado.
 * Usa localStorage como caché inmediato antes de confirmar con el servidor.
 *
 * Devuelve:
 *   null     → todavía verificando
 *   true     → acceso permitido (registrado)
 *   false    → acceso bloqueado (no registrado)
 */
export function useAcceso(): boolean | null {
  // Optimista: si localStorage dice que está registrado, arrancar con true
  const [acceso, setAcceso] = useState<boolean | null>(() => {
    if (typeof window === 'undefined') return null;
    return !!localStorage.getItem(LS_ALIAS_KEY);
  });

  useEffect(() => {
    const id = localStorage.getItem(LS_KEY);
    if (!id) { setAcceso(false); return; }

    // Confirmar con el servidor
    fetch(`/api/dispositivos?id=${id}`)
      .then(r => r.json())
      .then((data: { ok: boolean; encontrado?: boolean; registrado?: boolean }) => {
        if (data.ok && data.encontrado && data.registrado) {
          setAcceso(true);
        } else {
          // Si el servidor dice no registrado, limpiar caché local
          localStorage.removeItem(LS_ALIAS_KEY);
          setAcceso(false);
        }
      })
      .catch(() => {
        // Sin conexión: respetar caché local
        setAcceso(!!localStorage.getItem(LS_ALIAS_KEY));
      });
  }, []);

  return acceso;
}
