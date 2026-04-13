'use client';

import { CierreDiaSectionProps } from '../types/index';
import { formatearFecha } from '../utils/formatters';

export default function CierreDiaSection({
  caja,
  totales,
  onDescargar,
  onCerrar,
}: CierreDiaSectionProps) {
  const puedeDescargar = caja.turnos.length > 0;

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-900/10 border border-purple-200 dark:border-purple-800 shadow-md">
        <h2 className="text-xl font-bold text-purple-900 dark:text-purple-100 mb-4">
          🔒 Cierre de Día
        </h2>

        <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
          Fecha: <span className="font-semibold">{formatearFecha(new Date(caja.fecha + 'T00:00:00'))}</span>
        </p>

        <p className="text-sm text-purple-700 dark:text-purple-300 mb-4">
          Estado: <span className={`font-bold ${caja.estado === 'cerrada' ? 'text-red-600' : 'text-green-600'}`}>
            {caja.estado === 'cerrada' ? '🔒 Cerrada' : '🔓 Abierta'}
          </span>
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDescargar}
            disabled={!puedeDescargar || caja.estado === 'cerrada'}
            className={`flex-1 px-4 py-3 rounded-lg font-bold transition-colors ${
              !puedeDescargar || caja.estado === 'cerrada'
                ? 'bg-slate-200 dark:bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
            }`}
          >
            📥 Descargar Reporte .txt
          </button>

          <button
            onClick={onCerrar}
            disabled={caja.estado === 'cerrada'}
            className={`flex-1 px-4 py-3 rounded-lg font-bold transition-colors ${
              caja.estado === 'cerrada'
                ? 'bg-slate-200 dark:bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-red-600 dark:bg-red-700 text-white hover:bg-red-700 dark:hover:bg-red-600'
            }`}
          >
            🔒 Cerrar Caja
          </button>
        </div>

        {!puedeDescargar && (
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-3">
            ⚠️ Agrega al menos un turno para descargar el reporte
          </p>
        )}

        {caja.estado === 'cerrada' && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-3">
            ✓ La caja ya está cerrada. No se pueden hacer cambios.
          </p>
        )}
      </div>
    </div>
  );
}
