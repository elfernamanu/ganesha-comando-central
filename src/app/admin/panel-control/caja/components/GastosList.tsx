'use client';

import { GastosListProps } from '../types/index';
import { formatearDinero, formatearConcepto } from '../utils/formatters';
import { desglosarGastos } from '../utils/calculosCaja';

export default function GastosList({ gastos, onEliminar }: GastosListProps) {
  const desglose = desglosarGastos(gastos);
  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

  if (gastos.length === 0) {
    return (
      <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500">
        Sin gastos registrados
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Lista de gastos */}
      <div className="space-y-2">
        {gastos.map(gasto => (
          <div
            key={gasto.id}
            className="flex justify-between items-center p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow"
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{formatearConcepto(gasto.concepto)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {gasto.categoria} {gasto.notas && `• ${gasto.notas}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-sm">{formatearDinero(gasto.monto)}</span>
              <button
                onClick={() => onEliminar(gasto.id)}
                className="px-2 py-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desglose */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Alquiler</p>
          <p className="font-bold text-sm">{formatearDinero(desglose.alquiler)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Servicios</p>
          <p className="font-bold text-sm">{formatearDinero(desglose.servicios)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Otros</p>
          <p className="font-bold text-sm">{formatearDinero(desglose.otros)}</p>
        </div>
      </div>

      {/* Total */}
      <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <span className="font-bold">TOTAL GASTOS:</span>
        <span className="font-bold text-lg text-red-600 dark:text-red-400">{formatearDinero(totalGastos)}</span>
      </div>
    </div>
  );
}
