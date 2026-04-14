'use client';

import { useState, useEffect } from 'react';

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

const CONFIG: Record<Estado, { dot: string; texto: string; label: string }> = {
  cargando:  { dot: 'bg-slate-400 animate-pulse',                       texto: 'text-slate-400',                      label: 'Verificando...'    },
  estable:   { dot: 'bg-green-500 animate-pulse',                       texto: 'text-green-600 dark:text-green-400',  label: 'Sistema Estable'   },
  degradado: { dot: 'bg-yellow-500 animate-pulse',                      texto: 'text-yellow-600 dark:text-yellow-400',label: 'Sistema Degradado' },
  error:     { dot: 'bg-red-500',                                        texto: 'text-red-600 dark:text-red-400',      label: 'Sistema con Error' },
};

export function EstadoSistema({ compact = false }: { compact?: boolean }) {
  const [estado,  setEstado]  = useState<Estado>('cargando');
  const [detalle, setDetalle] = useState('');
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function chequear() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (cancelado) return;

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
      } catch {
        if (!cancelado) { setEstado('error'); setDetalle('Sin conexión al servidor'); }
      }
    }

    chequear();
    // Re-chequea cada 5 minutos
    const interval = setInterval(chequear, 5 * 60 * 1000);
    return () => { cancelado = true; clearInterval(interval); };
  }, []);

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
