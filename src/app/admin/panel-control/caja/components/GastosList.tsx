'use client';

import { GastosListProps } from '../types/index';
import { formatearDinero, formatearConcepto } from '../utils/formatters';
import { desglosarGastos } from '../utils/calculosCaja';

export default function GastosList({ gastos, onEliminar }: GastosListProps) {
  const desglose = desglosarGastos(gastos);
  const total = gastos.reduce((s, g) => s + g.monto, 0);

  if (gastos.length === 0) return null;

  return (
    <div className="space-y-0.5">
      {/* Items */}
      {gastos.map(g => (
        <div key={g.id}
          className="flex items-center justify-between px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <span className="text-xs font-medium truncate flex-1">{formatearConcepto(g.concepto)}</span>
          <span className="text-[10px] text-slate-400 mx-2 shrink-0">{g.categoria}</span>
          <span className="text-xs font-bold font-mono shrink-0">{formatearDinero(g.monto)}</span>
          <button onClick={() => onEliminar(g.id)}
            className="ml-1.5 w-4 h-4 flex items-center justify-center text-red-300 hover:text-red-600 text-[9px] rounded shrink-0">✕</button>
        </div>
      ))}

      {/* Total + desglose en una línea */}
      <div className="flex items-center justify-between px-2 py-1 rounded bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
        <div className="flex gap-2 text-[10px] text-slate-400">
          {desglose.alquiler > 0 && <span>🏪 {formatearDinero(desglose.alquiler)}</span>}
          {desglose.servicios > 0 && <span>⚡ {formatearDinero(desglose.servicios)}</span>}
          {desglose.otros > 0 && <span>📦 {formatearDinero(desglose.otros)}</span>}
        </div>
        <span className="text-xs font-extrabold text-red-600 dark:text-red-400">
          Total {formatearDinero(total)}
        </span>
      </div>
    </div>
  );
}
