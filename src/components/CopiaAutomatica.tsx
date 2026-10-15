'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import {
  leerClavesLocales, leerClavesConRespaldo, guardarRespaldoInicial,
  tieneDatosParaSubir, subirCopia, MARCA_COPIA_AUTO,
} from '@/lib/copiaLocal';

let enCurso = false;

/**
 * 1. Guarda un respaldo interno de los datos de este dispositivo (una sola vez).
 * 2. La primera vez que abre la app con el servidor conectado, sube esos datos solo.
 * Invisible salvo un aviso al terminar. Si el servidor no está o algo falla, lo reintenta
 * en la próxima carga.
 */
export default function CopiaAutomatica() {
  const { mostrar } = useToast();

  // Se lee al dibujar, antes de que cualquier pantalla consulte al servidor
  const [alAbrir] = useState<Record<string, unknown> | null>(() => {
    if (typeof window === 'undefined') return null;
    try { return leerClavesLocales(); } catch { return null; }
  });

  useEffect(() => {
    if (enCurso || !alAbrir) return;
    enCurso = true;
    (async () => {
      try {
        try { await guardarRespaldoInicial(alAbrir); } catch { /* navegador sin IndexedDB */ }

        try { if (localStorage.getItem(MARCA_COPIA_AUTO)) return; } catch { return; }
        const claves = await leerClavesConRespaldo();
        if (!tieneDatosParaSubir(claves)) return;

        const r = await fetch('/api/admin/instalar', { cache: 'no-store' });
        const estado = await r.json() as { conectado?: boolean };
        if (!estado.conectado) return;
        const resumen = await subirCopia(claves);
        try { localStorage.setItem(MARCA_COPIA_AUTO, JSON.stringify({ fecha: new Date().toISOString(), resumen })); } catch { /* sin espacio: se reintenta, sin riesgo */ }
        const cambios = resumen.turnosAgregados + resumen.turnosCompletados + resumen.contactosAgregados;
        if (cambios > 0) {
          mostrar('Datos de este dispositivo copiados al servidor', 'exito',
            `${resumen.turnosAgregados} turnos nuevos · ${resumen.turnosCompletados} completados · ${resumen.contactosAgregados} contactos`);
        }
      } catch { /* sin conexión o servidor caído: se reintenta en la próxima carga */ }
      finally { enCurso = false; }
    })();
  }, [alAbrir, mostrar]);

  return null;
}
