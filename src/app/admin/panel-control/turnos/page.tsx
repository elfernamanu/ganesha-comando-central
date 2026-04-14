'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useTurnos } from './hooks/useTurnos';
import TurnosTable from './components/TurnosTable';

function TurnosContent() {
  const params = useSearchParams();
  const hoy    = new Date().toISOString().split('T')[0];
  const fecha  = params.get('fecha') ?? hoy;
  const esHoy  = fecha === hoy;

  const { turnos, totales, mensaje, guardando, agregarTurno, actualizarTurno, eliminarTurno, guardar } = useTurnos(fecha);

  const fechaLabel = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());

  return (
    <div className="space-y-4">

      {/* Encabezado */}
      <div className="flex justify-between items-start">
        <div>
          {/* Título: solo en desktop */}
          <h1 className="hidden md:block text-2xl font-bold">📅 Turnos del Día</h1>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
            {fechaLabel}
            {!esHoy && (
              <Link href="/admin/panel-control/turnos"
                className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline">
                → Ir a hoy
              </Link>
            )}
          </p>
        </div>
        <Link href="/admin/panel-control"
          className="hidden md:inline-flex text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded">
          ← Panel
        </Link>
      </div>

      {/* Stats del día — cards nativas */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <p className="text-[11px] text-slate-400 font-medium leading-tight mb-1">Turnos</p>
          <p className="font-extrabold text-xl leading-none text-slate-800 dark:text-white">{totales.total_turnos}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <p className="text-[11px] text-slate-400 font-medium leading-tight mb-1">Presentes</p>
          <p className="font-extrabold text-xl leading-none text-green-600">{totales.asistencias}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <p className="text-[11px] text-slate-400 font-medium leading-tight mb-1">No vino</p>
          <p className="font-extrabold text-xl leading-none text-red-500">{totales.ausentes}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <p className="text-[11px] text-slate-400 font-medium leading-tight mb-1">Cobrado</p>
          <p className="font-extrabold text-xl leading-none text-violet-600">
            ${totales.ingresos_seña >= 1000
              ? (totales.ingresos_seña / 1000).toFixed(0) + 'k'
              : totales.ingresos_seña}
          </p>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`p-3 rounded-xl text-sm whitespace-pre-line font-medium ${
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
        className="w-full px-4 py-4 rounded-2xl bg-violet-600 dark:bg-violet-700 text-white font-bold text-base hover:bg-violet-700 dark:hover:bg-violet-600 disabled:opacity-50 transition-all active:scale-[0.98] shadow-lg shadow-violet-200 dark:shadow-violet-900/30"
      >
        {guardando ? '⏳ Guardando...' : '💾 Guardar Turnos'}
      </button>
    </div>
  );
}

export default function TurnosPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Cargando turnos...</p>
      </div>
    }>
      <TurnosContent />
    </Suspense>
  );
}
