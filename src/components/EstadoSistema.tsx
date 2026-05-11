'use client';

import { useState, useEffect, useCallback } from 'react';

type Estado = 'cargando' | 'estable' | 'degradado' | 'error';

interface HealthData {
  postgres?: { estado: string };
  env?: { POSTGRES_URL: string; API_SECRET: string };
}

function calcularEstado(data: HealthData): Estado {
  const pgOk  = data.postgres?.estado?.includes('✅');
  const envOk = data.env?.POSTGRES_URL?.includes('✅');
  if (pgOk && envOk)  return 'estable';
  if (pgOk || envOk)  return 'degradado';
  return 'error';
}

// Pulse solo cuando hay un problema — en estable, dot estático para
// evitar animaciones CSS corriendo todo el día.
const CONFIG: Record<Estado, { dot: string; texto: string; label: string }> = {
  cargando:  { dot: 'bg-slate-400 animate-pulse',                       texto: 'text-slate-400',                      label: 'Verificando...'    },
  estable:   { dot: 'bg-green-500',                                     texto: 'text-green-600 dark:text-green-400',  label: 'Sistema Estable'   },
  degradado: { dot: 'bg-yellow-500 animate-pulse',                      texto: 'text-yellow-600 dark:text-yellow-400',label: 'Sistema Degradado' },
  error:     { dot: 'bg-red-500',                                       texto: 'text-red-600 dark:text-red-400',      label: 'Sistema con Error' },
};

export function EstadoSistema({ compact = false }: { compact?: boolean }) {
  const [estado,  setEstado]  = useState<Estado>('cargando');
  const [detalle, setDetalle] = useState('');
  const [mostrar, setMostrar] = useState(false);

  const chequear = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store', signal });
      if (!res.ok) { setEstado('error'); setDetalle('No responde'); return; }

      const data: HealthData = await res.json();
      const e = calcularEstado(data);
      setEstado(e);

      if (e !== 'estable') {
        const problemas: string[] = [];
        if (!data.postgres?.estado?.includes('✅')) problemas.push('Base de datos sin conexión');
        if (!data.env?.POSTGRES_URL?.includes('✅'))  problemas.push('Variable POSTGRES_URL falta');
        setDetalle(problemas.join(' · '));
      } else {
        setDetalle('');
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setEstado('error');
      setDetalle('Sin conexión al servidor');
    }
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval !== null) return;
      // Re-chequea cada 5 minutos
      interval = setInterval(() => chequear(), 5 * 60 * 1000);
    };
    const stop = () => {
      if (interval === null) return;
      clearInterval(interval);
      interval = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        chequear();
        start();
      } else {
        stop();
      }
    };

    chequear(ctrl.signal);
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      ctrl.abort();
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [chequear]);

  const { dot, texto, label } = CONFIG[estado];

  return (
    <div className="relative">
      <button
        onClick={() => setMostrar(m => !m)}
        className={`flex items-center gap-1.5 text-xs ${texto} transition-colors`}
        title="Ver estado del sistema"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {!compact && label}
      </button>

      {/* Tooltip con detalle — solo si hay problema */}
      {mostrar && (
        <div className="absolute top-6 left-0 z-50 w-64 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl text-xs space-y-1">
          <p className={`font-bold ${texto}`}>{label}</p>
          {detalle && <p className="text-slate-500 dark:text-slate-400">{detalle}</p>}
          {!detalle && <p className="text-slate-400">PostgreSQL ✅ · API ✅ · Todo en orden</p>}
          <a
            href="/api/health"
            target="_blank"
            className="block text-blue-500 hover:underline mt-1"
          >
            Ver diagnóstico completo →
          </a>
        </div>
      )}
    </div>
  );
}
