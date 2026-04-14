'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTurnos } from './hooks/useTurnos';
import TurnosTable from './components/TurnosTable';

function TurnosContent() {
  const params = useSearchParams();
  const hoy    = new Date().toISOString().split('T')[0];
  // Si viene ?fecha=2026-04-15 desde la agenda, usa esa fecha; si no, hoy
  const fecha  = params.get('fecha') ?? hoy;
  const esHoy  = fecha === hoy;

  const { turnos, totales, mensaje, guardando, agregarTurno, actualizarTurno, eliminarTurno, guardar } = useTurnos(fecha);

  const fechaLabel = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">📅 Turnos del Día</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
            {fechaLabel}
            {!esHoy && (
              <Link href={`/admin/panel-control/turnos`}
                className="text-xs text-blue-500 hover:underline">
                (ir a hoy)
              </Link>
            )}
          </p>
        </div>
        <Link href="/admin/panel-control"
          className="text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded">
          ← Panel
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg">
        <div className="text-center">
          <p className="text-[10px] text-slate-500 leading-tight">Total</p>
          <p className="font-bold text-sm">{totales.total_turnos}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 leading-tight">Presentes</p>
          <p className="font-bold text-sm text-green-600">{totales.asistencias}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 leading-tight">No vino</p>
          <p className="font-bold text-sm text-red-600">{totales.ausentes}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-500 leading-tight">Cobrado</p>
          <p className="font-bold text-sm text-blue-600">
            ${totales.ingresos_seña >= 1000
              ? (totales.ingresos_seña / 1000).toFixed(0) + 'k'
              : totales.ingresos_seña}
          </p>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-3 rounded-lg text-sm whitespace-pre-line font-medium ${
          mensaje.startsWith('⛔')
            ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700'
            : mensaje.startsWith('⚠️')
            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
            : 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'
        }`}>
          {mensaje}
        </div>
      )}

      <TurnosTable
        turnos={turnos}
        onActualizar={actualizarTurno}
        onEliminar={eliminarTurno}
        onAgregar={agregarTurno}
      />

      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full px-4 py-3 rounded-lg bg-blue-600 dark:bg-blue-700 text-white font-bold hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
      >
        {guardando ? '⏳ Guardando...' : '💾 Guardar Turnos'}
      </button>
    </div>
  );
}

export default function TurnosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando turnos...</div>}>
      <TurnosContent />
    </Suspense>
  );
}
