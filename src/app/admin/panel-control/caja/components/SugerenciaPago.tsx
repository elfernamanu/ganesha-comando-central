'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GastoFijo, TipoGastoFijo } from '../hooks/useGastosFijos';

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

interface Props {
  montoPagado: number;
  clienteNombre: string;
  gastosPendientes: GastoFijo[];
  onAplicar: (id: string, monto: number, tipo: TipoGastoFijo) => void;
  onCerrar: () => void;
}

export default function SugerenciaPago({
  montoPagado,
  clienteNombre,
  gastosPendientes,
  onAplicar,
  onCerrar,
}: Props) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [progreso, setProgreso] = useState(100);

  // Auto-dismiss en 10 segundos con barra de progreso
  useEffect(() => {
    const duracion = 10000;
    const intervalo = 100;
    const pasos = duracion / intervalo;
    let paso = 0;

    const timer = setInterval(() => {
      paso++;
      setProgreso(Math.max(0, 100 - (paso / pasos) * 100));
      if (paso >= pasos) {
        clearInterval(timer);
        onCerrar();
      }
    }, intervalo);

    return () => clearInterval(timer);
  }, [onCerrar]);

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAplicar = useCallback(() => {
    if (seleccionados.size === 0) return;

    const gastosSeleccionados = gastosPendientes.filter(g => seleccionados.has(g.id));
    let restante = montoPagado;

    for (const g of gastosSeleccionados) {
      if (restante <= 0) break;
      const pendiente = Math.max(0, g.montoTotal - g.montoAcumulado);
      const aPagar = Math.min(pendiente > 0 ? pendiente : restante, restante);
      if (aPagar > 0) {
        onAplicar(g.id, aPagar, g.tipo);
        restante -= aPagar;
      }
    }

    onCerrar();
  }, [seleccionados, gastosPendientes, montoPagado, onAplicar, onCerrar]);

  const pendientesFiltrados = gastosPendientes.filter(g => !g.pagado);

  if (pendientesFiltrados.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-2xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

      {/* Barra de progreso auto-dismiss */}
      <div className="h-0.5 bg-slate-100 dark:bg-slate-700">
        <div
          className="h-full bg-amber-400 transition-all duration-100 ease-linear"
          style={{ width: `${progreso}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-3 pt-2.5 pb-1.5 border-b border-slate-100 dark:border-slate-700">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
            💳 {clienteNombre.split(' ')[0]} pagó {fmt(montoPagado)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            ¿Aplicar a gastos fijos?
          </p>
        </div>
        <button
          onClick={onCerrar}
          className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold leading-none mt-0.5"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      {/* Lista de gastos pendientes */}
      <div className="px-2 py-1.5 space-y-0.5 max-h-48 overflow-y-auto">
        {pendientesFiltrados.map(g => {
          const pendiente = g.montoTotal > 0 ? Math.max(0, g.montoTotal - g.montoAcumulado) : 0;
          const checked = seleccionados.has(g.id);
          return (
            <label
              key={g.id}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors ${
                checked
                  ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent'
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleSeleccion(g.id)}
                className="rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-400 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate block">
                  {g.nombre}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                {pendiente > 0 ? `-${fmt(pendiente)}` : g.tipo === 'empresa' ? '💼' : '🏠'}
              </span>
            </label>
          );
        })}
      </div>

      {/* Botones */}
      <div className="flex gap-1.5 px-2 pb-2.5 pt-1 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={handleAplicar}
          disabled={seleccionados.size === 0}
          className="flex-1 px-2 py-1.5 rounded-lg bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Aplicar seleccionados ({seleccionados.size})
        </button>
        <button
          onClick={onCerrar}
          className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          Omitir
        </button>
      </div>
    </div>
  );
}
