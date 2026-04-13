'use client';

import { EstadisticasProps } from '../types/index';
import { formatearDinero } from '../utils/formatters';

export default function EstadisticasResumen({
  ingresos,
  gastos,
  ganancia,
}: EstadisticasProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* INGRESOS */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-900/10 border border-emerald-200 dark:border-emerald-800 shadow-md">
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          💰 INGRESOS
        </p>
        <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mt-2">
          {formatearDinero(ingresos)}
        </p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
          Total cobrado del día
        </p>
      </div>

      {/* GASTOS */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-900/10 border border-red-200 dark:border-red-800 shadow-md">
        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
          💸 GASTOS
        </p>
        <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-2">
          {formatearDinero(gastos)}
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          Total gastado del día
        </p>
      </div>

      {/* GANANCIA */}
      <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/10 border border-blue-200 dark:border-blue-800 shadow-md">
        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          📈 GANANCIA NETA
        </p>
        <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">
          {formatearDinero(ganancia)}
        </p>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
          {ganancia >= 0 ? '✓ Positivo' : '✗ Negativo'}
        </p>
      </div>
    </div>
  );
}
