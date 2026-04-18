'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useCallback, useState } from 'react';
import { useTurnos } from './hooks/useTurnos';
import TurnosTable from './components/TurnosTable';
import { useFechasHabilitadas } from '../_shared/useFechasHabilitadas';

function RecuperarBackupButton({ fecha }: { fecha: string }) {
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'confirmando' | 'restaurando'>('idle');
  const [backupInfo, setBackupInfo] = useState<{ guardado_at: string; cant: number } | null>(null);

  const verificar = async () => {
    setEstado('cargando');
    try {
      const res = await fetch(`/api/backup?restaurar=turnos&clave=${fecha}`);
      const data = await res.json() as { ok: boolean; datos?: unknown[]; guardado_at?: string };
      if (!data.ok || !data.datos) { setEstado('idle'); alert('No hay backup previo para esta fecha.'); return; }
      setBackupInfo({ guardado_at: data.guardado_at ?? '', cant: Array.isArray(data.datos) ? data.datos.length : 0 });
      setEstado('confirmando');
    } catch { setEstado('idle'); alert('Error al consultar backup'); }
  };

  const restaurar = async () => {
    setEstado('restaurando');
    try {
      const res = await fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'restaurar', tabla: 'turnos', clave: fecha }) });
      const data = await res.json() as { ok: boolean; mensaje?: string };
      if (data.ok) { alert(`✅ ${data.mensaje}\nRecargá la página para ver los turnos restaurados.`); }
      else { alert(`❌ Error: ${data.mensaje}`); }
    } catch { alert('Error al restaurar'); }
    setEstado('idle');
    setBackupInfo(null);
  };

  if (estado === 'confirmando' && backupInfo) {
    const fechaBackup = new Date(backupInfo.guardado_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-amber-600 font-semibold">Backup del {fechaBackup} — {backupInfo.cant} turnos</span>
        <button onClick={restaurar} className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600">Restaurar</button>
        <button onClick={() => setEstado('idle')} className="text-[11px] text-slate-400 hover:text-slate-600">✕</button>
      </div>
    );
  }

  return (
    <button onClick={verificar} disabled={estado === 'cargando' || estado === 'restaurando'}
      className="text-[11px] text-violet-500 dark:text-violet-400 hover:underline disabled:opacity-50">
      {estado === 'cargando' ? '⏳ Buscando...' : '🔄 Recuperar backup'}
    </button>
  );
}

function TurnosContent() {
  const params = useSearchParams();
  const router = useRouter();
  // Fecha LOCAL — no UTC (evita mostrar el día siguiente pasada las 21hs en Argentina)
  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fecha  = params.get('fecha') ?? hoy;
  const esHoy  = fecha === hoy;

  const { turnos, totales, mensaje, guardando, autoGuardado, cargandoInicial, ultimaActualizacion, celularesSync, agregarTurno, actualizarTurno, eliminarTurno, confirmarCelular, guardar } = useTurnos(fecha);

  const sinGuardar = autoGuardado === 'pendiente' || autoGuardado === 'error';

  // Alerta al cerrar/recargar la página con cambios sin guardar
  useEffect(() => {
    if (!sinGuardar) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [sinGuardar]);

  // Navegar a otra fecha con confirmación si hay cambios pendientes
  const navegarFecha = useCallback((destino: string) => {
    if (sinGuardar) {
      const ok = confirm('⚠️ Los turnos no se guardaron en el servidor todavía.\n¿Querés guardar antes de cambiar de fecha?');
      if (ok) { guardar(); return; }
    }
    router.push(`/admin/panel-control/turnos?fecha=${destino}`);
  }, [sinGuardar, guardar, router]);

  const fechasHabilitadas = useFechasHabilitadas();

  // Auto-navegar a la próxima fecha con jornada si hoy no tiene ninguna
  useEffect(() => {
    if (params.get('fecha')) return; // ya hay fecha en URL, no redirigir
    if (fechasHabilitadas.length === 0) return; // todavía cargando
    const tieneFechaHoy = fechasHabilitadas.some(f => f.fecha === hoy);
    if (!tieneFechaHoy) {
      // Ir a la próxima fecha habilitada
      const proxima = fechasHabilitadas.find(f => f.fecha >= hoy);
      if (proxima) router.replace(`/admin/panel-control/turnos?fecha=${proxima.fecha}`);
    }
  }, [fechasHabilitadas, hoy, params, router]);
  const fechaLabel = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());

  // Calcular fecha anterior y siguiente
  const fechaObj  = new Date(fecha + 'T12:00:00');
  const prevDate  = new Date(fechaObj); prevDate.setDate(prevDate.getDate() - 1);
  const nextDate  = new Date(fechaObj); nextDate.setDate(nextDate.getDate() + 1);
  const prevStr   = prevDate.toISOString().split('T')[0];
  const nextStr   = nextDate.toISOString().split('T')[0];

  return (
    <div className="space-y-2 min-w-0 overflow-x-hidden">

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
        {/* Sin link al Panel — Turnos es solo para la secretaria */}
      </div>

      {/* ── Fechas habilitadas — acceso rápido (solo hoy en adelante) ── */}
      {fechasHabilitadas.filter(({ fecha: f }) => f >= hoy).length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {fechasHabilitadas
            .filter(({ fecha: f }) => f >= hoy)
            .map(({ fecha: f, servicios }) => {
              const esSeleccionada = f === fecha;
              const label = new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
              return (
                <Link key={f} href={`/admin/panel-control/turnos?fecha=${f}`}
                  className={`flex flex-col items-center px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    esSeleccionada
                      ? 'bg-violet-600 text-white border-violet-600 shadow'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-400'
                  }`}>
                  <span className="text-[11px] font-extrabold">{label}</span>
                  <span className="text-[9px] font-medium opacity-80">{servicios.join(' · ')}</span>
                </Link>
              );
            })}
        </div>
      )}

      {/* ── Alerta turnos sin guardar ── */}
      {sinGuardar && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
            ⚠️ {autoGuardado === 'error' ? 'Sin conexión — turnos guardados solo en este dispositivo' : 'Guardando en servidor...'}
          </p>
          <button onClick={guardar} disabled={guardando}
            className="px-3 py-1 text-xs rounded-lg bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-50 shrink-0">
            {guardando ? '⏳' : '💾 Guardar ya'}
          </button>
        </div>
      )}

      {/* ── Navegación entre días ── */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 rounded-2xl px-3 py-2 border border-slate-100 dark:border-slate-700 shadow-sm">
        <button
          onClick={() => navegarFecha(prevStr)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Anterior
        </button>

        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
          {esHoy ? '📅 Hoy' : fecha}
        </span>

        <button
          onClick={() => navegarFecha(nextStr)}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
        >
          Siguiente
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </button>
      </div>

      {/* Bloqueo total hasta tener datos reales del servidor */}
      {cargandoInicial ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Cargando datos del servidor...</p>
            <p className="text-xs text-slate-400 mt-1">Esperando confirmación antes de mostrar</p>
          </div>
        </div>
      ) : (
      <>

      {/* Stats del día — cards nativas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <p className="text-[11px] text-slate-400 font-medium leading-tight mb-1">Turnos</p>
          <p className="font-extrabold text-xl leading-none text-slate-800 dark:text-white">{totales.total_turnos}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <p className="text-[11px] text-slate-400 font-medium leading-tight mb-1">Presentes</p>
          <p className="font-extrabold text-xl leading-none text-green-600">{totales.asistencias}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
          <p className="text-[11px] text-slate-400 font-medium leading-tight mb-1">No vino</p>
          <p className="font-extrabold text-xl leading-none text-red-500">{totales.ausentes}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 shadow-sm border border-slate-100 dark:border-slate-700 text-center">
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
        celularesSync={celularesSync}
        onActualizar={actualizarTurno}
        onEliminar={eliminarTurno}
        onAgregar={agregarTurno}
        onConfirmarCelular={confirmarCelular}
      />

      {/* Último guardado + recuperar backup */}
      {ultimaActualizacion && (
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Servidor actualizado: {new Date(ultimaActualizacion).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
          </p>
          <RecuperarBackupButton fecha={fecha} />
        </div>
      )}

      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full px-4 py-4 rounded-2xl bg-violet-600 dark:bg-violet-700 text-white font-bold text-base hover:bg-violet-700 dark:hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-lg shadow-violet-200 dark:shadow-violet-900/30"
      >
        {guardando ? '⏳ Guardando...' : '💾 Guardar Turnos'}
      </button>

      </> /* fin bloque que requiere datos del servidor */
      )}
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
