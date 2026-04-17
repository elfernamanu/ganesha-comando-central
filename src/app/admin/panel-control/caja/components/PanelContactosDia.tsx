'use client';

/**
 * PanelContactosDia — aparece cuando la caja está cerrada.
 * Muestra cada clienta del día con campo de celular editable.
 * Ausentes reciben nota automática "⚠️ Cobrar seña".
 * Guarda en /api/clientes (config_servicios id=-4).
 */

import { useState, useEffect, useRef } from 'react';

interface Turno {
  clienteNombre: string;
  asistencia?: string;
  tratamiento?: string;
}

interface ClienteData {
  id: string;
  nombre: string;
  celular: string;
  notas: string;
}

interface EntradaDia {
  nombre: string;
  celular: string;
  tratamiento: string;
  ausente: boolean;
  yaExistia: boolean; // ya tenía datos en servidor
}

interface Props {
  turnos: Turno[];
}

export default function PanelContactosDia({ turnos }: Props) {
  const [entradas, setEntradas] = useState<EntradaDia[]>([]);
  const [guardando, setGuardando]   = useState(false);
  const [guardado, setGuardado]     = useState(false);
  const [cerrado, setCerrado]       = useState(false);
  const [cargando, setCargando]     = useState(true);
  const [autoGuardado, setAutoGuardado] = useState<'idle' | 'pendiente' | 'ok' | 'error'>('idle');
  const ultimoGuardadoManual        = useRef(0);
  const cargaCompleta               = useRef(false);

  // Armar lista única de clientas del día + datos del servidor
  useEffect(() => {
    if (turnos.length === 0) { setCargando(false); return; }

    // 1. Deduplicar clientas del día (una entrada por nombre)
    const unicasMap = new Map<string, EntradaDia>();
    for (const t of turnos) {
      const nombre = t.clienteNombre?.trim();
      if (!nombre) continue;
      const key = nombre.toLowerCase();
      if (!unicasMap.has(key)) {
        unicasMap.set(key, {
          nombre,
          celular: '',
          tratamiento: t.tratamiento ?? '',
          ausente: t.asistencia === 'no_vino',
          yaExistia: false,
        });
      } else if (t.asistencia === 'no_vino') {
        // Si tuvo múltiples turnos y alguno fue ausente, marcar
        unicasMap.get(key)!.ausente = true;
      }
    }

    // 2. Cruzar con datos del servidor para pre-llenar celular
    fetch('/api/clientes')
      .then(r => r.json())
      .then((data: { ok: boolean; datos?: ClienteData[] }) => {
        const serverMap = new Map((data.datos ?? []).map(c => [c.nombre.toLowerCase(), c]));
        const lista: EntradaDia[] = [];
        for (const [key, entrada] of unicasMap) {
          const server = serverMap.get(key);
          lista.push({
            ...entrada,
            celular: server?.celular ?? '',
            yaExistia: !!server?.celular,
          });
        }
        setEntradas(lista.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      })
      .catch(() => {
        setEntradas(Array.from(unicasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      })
      .finally(() => { setCargando(false); cargaCompleta.current = true; });
  }, [turnos]);

  // Auto-guardado 3s después de cada cambio de celular
  useEffect(() => {
    if (!cargaCompleta.current || entradas.length === 0) return;
    setAutoGuardado('pendiente');
    const timer = setTimeout(async () => {
      if (Date.now() - ultimoGuardadoManual.current < 5000) return;
      try {
        const resGet = await fetch('/api/clientes');
        const dataGet = await resGet.json() as { ok: boolean; datos?: ClienteData[] };
        const serverClientes: ClienteData[] = dataGet.ok ? (dataGet.datos ?? []) : [];
        const byNombre = new Map(serverClientes.map(c => [c.nombre.toLowerCase(), { ...c }]));
        for (const e of entradas) {
          const key = e.nombre.toLowerCase();
          const existing = byNombre.get(key);
          let notas = existing?.notas ?? '';
          if (e.ausente && !notas) notas = '⚠️ Cobrar seña — faltó turno';
          byNombre.set(key, { ...existing, id: existing?.id ?? crypto.randomUUID(), nombre: e.nombre, celular: e.celular.trim() || (existing?.celular ?? ''), notas });
        }
        const res = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos: Array.from(byNombre.values()) }) });
        const d = await res.json() as { ok: boolean };
        if (d.ok) { setAutoGuardado('ok'); setTimeout(() => setAutoGuardado('idle'), 3000); }
        else { setAutoGuardado('error'); setTimeout(() => setAutoGuardado('idle'), 4000); }
      } catch { setAutoGuardado('error'); setTimeout(() => setAutoGuardado('idle'), 4000); }
    }, 3000);
    return () => clearTimeout(timer);
  }, [entradas]);

  const cambiarCelular = (nombre: string, celular: string) => {
    setGuardado(false);
    setEntradas(prev => prev.map(e => e.nombre === nombre ? { ...e, celular } : e));
  };

  const guardar = async () => {
    ultimoGuardadoManual.current = Date.now();
    setAutoGuardado('idle');
    setGuardando(true);
    try {
      // 1. Traer lista completa del servidor para no perder otros clientes
      const resGet = await fetch('/api/clientes');
      const dataGet = await resGet.json() as { ok: boolean; datos?: ClienteData[] };
      const serverClientes: ClienteData[] = dataGet.ok ? (dataGet.datos ?? []) : [];

      const byNombre = new Map(serverClientes.map(c => [c.nombre.toLowerCase(), { ...c }]));

      // 2. Upsert cada clienta del día
      for (const e of entradas) {
        const key = e.nombre.toLowerCase();
        const existing = byNombre.get(key);

        // Nota automática si faltó (no sobreescribir si ya tenía otra nota)
        let notas = existing?.notas ?? '';
        if (e.ausente && !notas) {
          notas = '⚠️ Cobrar seña — faltó turno';
        }

        byNombre.set(key, {
          ...existing,
          id:      existing?.id ?? crypto.randomUUID(),
          nombre:  e.nombre,
          celular: e.celular.trim() || (existing?.celular ?? ''),
          notas,
        });
      }

      const lista = Array.from(byNombre.values());
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: lista }),
      });
      const d = await res.json() as { ok: boolean };
      if (d.ok) setGuardado(true);
      else setAutoGuardado('error');
    } catch { setAutoGuardado('error'); }
    finally { setGuardando(false); setTimeout(() => setAutoGuardado('idle'), 4000); }
  };

  if (cerrado || cargando || entradas.length === 0) return null;

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 overflow-hidden">

      {/* Encabezado */}
      <div className="flex items-center justify-between px-3 py-2 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-100 dark:border-violet-800">
        <p className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide">
          📱 Contactos del día
        </p>
        <div className="flex items-center gap-2">
          {autoGuardado !== 'idle' && (
            <span className={`text-[11px] font-semibold flex items-center gap-1 ${autoGuardado === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : autoGuardado === 'error' ? 'text-amber-500' : 'text-slate-400'}`}>
              {autoGuardado === 'pendiente' && <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin inline-block" />}
              {autoGuardado === 'ok' ? '✓ guardado' : autoGuardado === 'error' ? '⚠️ sin conexión' : 'guardando...'}
            </span>
          )}
          {guardado && autoGuardado === 'idle' && <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">✓ guardado en servidor</span>}
          <button onClick={() => setCerrado(true)} className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-1">✕</button>
        </div>
      </div>

      {/* Lista */}
      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
        {entradas.map(e => (
          <div key={e.nombre} className={`flex items-center gap-2 px-3 py-1.5 ${e.ausente ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
            {/* Nombre + tratamiento + alerta */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                {e.nombre}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {e.tratamiento && e.tratamiento !== 'Otro' && (
                  <span className={`text-[10px] truncate ${e.tratamiento.includes('(Hombre)') ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'}`}>{e.tratamiento}</span>
                )}
                {e.ausente && (
                  <span className="text-[10px] font-semibold text-red-500 dark:text-red-400">
                    ✗ No vino · cobrar seña si vuelve
                  </span>
                )}
              </div>
            </div>

            {/* Input celular */}
            <input
              value={e.celular}
              onChange={ev => cambiarCelular(e.nombre, ev.target.value)}
              placeholder="📱 Celular"
              inputMode="tel"
              className={`w-36 px-2 py-0.5 text-xs rounded border font-mono shrink-0 bg-slate-50 dark:bg-slate-700 ${
                e.celular
                  ? 'border-emerald-300 dark:border-emerald-700'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Pie */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <p className="text-[10px] text-slate-400">
          {entradas.filter(e => e.celular).length}/{entradas.length} con celular
        </p>
        <button
          onClick={guardar}
          disabled={guardando || guardado}
          className="px-3 py-1 text-xs rounded-lg bg-violet-600 text-white font-semibold hover:bg-violet-700 disabled:opacity-50 transition-colors"
        >
          {guardado ? '✓ Guardado' : guardando ? 'Guardando...' : '💾 Guardar'}
        </button>
      </div>
    </div>
  );
}
