'use client';

import { useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { leerClavesLocales, tieneDatosParaSubir, subirCopia, MARCA_COPIA_AUTO } from '@/lib/copiaLocal';

let enCurso = false;

/**
 * La primera vez que este dispositivo abre la app con el servidor conectado,
 * sube solo lo que tiene guardado. Invisible salvo un aviso al terminar.
 * Si el servidor no está o algo falla, lo vuelve a intentar en la próxima carga.
 */
export default function CopiaAutomatica() {
  const { mostrar } = useToast();

  useEffect(() => {
    if (enCurso) return;
    let claves: Record<string, unknown>;
    try {
      if (localStorage.getItem(MARCA_COPIA_AUTO)) return;
      claves = leerClavesLocales();
    } catch { return; }
    if (!tieneDatosParaSubir(claves)) return;

    enCurso = true;
    (async () => {
      try {
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
  }, [mostrar]);

  return null;
}
