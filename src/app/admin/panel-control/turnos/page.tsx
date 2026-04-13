'use client';

import Link from 'next/link';
import { useTurnos } from './hooks/useTurnos';
import TurnosTable from './components/TurnosTable';

export default function TurnosPage() {
  const hoy = new Date().toISOString().split('T')[0];
  const { turnos, totales, mensaje, guardando, agregarTurno, actualizarTurno, eliminarTurno, guardar } = useTurnos(hoy);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">📅 Turnos del Día</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date(hoy).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link
          href="/admin/panel-control"
          className="text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded"
        >
          ← Panel
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-slate-500">Total</p>
          <p className="font-bold">{totales.total_turnos}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Presentes</p>
          <p className="font-bold text-green-600">{totales.asistencias}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">No vino</p>
          <p className="font-bold text-red-600">{totales.ausentes}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Ingresos</p>
          <p className="font-bold text-blue-600">
            ${(totales.ingresos_seña / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-sm text-blue-800 dark:text-blue-200">{mensaje}</div>}

      {/* Tabla */}
      <TurnosTable
        turnos={turnos}
        onActualizar={actualizarTurno}
        onEliminar={eliminarTurno}
        onAgregar={agregarTurno}
      />

      {/* Botones de acción */}
      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 px-4 py-3 rounded-lg bg-blue-600 dark:bg-blue-700 text-white font-bold hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {guardando ? '⏳ Guardando...' : '💾 Guardar Turnos'}
        </button>
        <Link
          href="/admin/panel-control/caja"
          className="flex-1 px-4 py-3 rounded-lg bg-emerald-600 dark:bg-emerald-700 text-white font-bold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-center"
        >
          💰 Ir a Caja
        </Link>
      </div>
    </div>
  );
}
