'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCajaDiaria } from './hooks/useCajaDiaria';
import { useGastosFijos } from './hooks/useGastosFijos';
import { useToast } from '@/components/Toast';
import { generarReporteTxt, descargarReporte } from './utils/reporteGenerator';
import { formatearDinero, formatearHora } from './utils/formatters';
import GastosForm from './components/GastosForm';
import GastosList from './components/GastosList';
import PanelGastosFijos from './components/PanelGastosFijos';
import SugerenciaPago from './components/SugerenciaPago';
import ResumenCierre from './components/ResumenCierre';
import type { GastoFijo } from './hooks/useGastosFijos';
import { useFechasHabilitadas } from '../_shared/useFechasHabilitadas';

function CajaContent() {
  const params = useSearchParams();
  // Fecha LOCAL (no UTC) — en Argentina a las 23:30 UTC sería el día siguiente
  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fecha = params.get('fecha') ?? hoy;
  const esHoy = fecha === hoy;

  const { mostrar } = useToast();

  const {
    turnos,
    gastos,
    totales,
    estadoCaja,
    guardando,
    agregarGasto,
    eliminarGasto,
    cerrarYGuardar,
    reabrirDia,
    cargarTurnos,
    recuperarReporte,
  } = useCajaDiaria(fecha);

  const {
    empresa: gastosFijosEmpresa,
    personal: gastosFijosPersonal,
    agregarEmpresa,
    agregarPersonal,
    pagarGasto: pagarGastoFijo,
    resetearGasto,
    eliminarGasto: eliminarGastoFijo,
    actualizarMonto,
    actualizarNombre,
    totalPendienteEmpresa,
    totalPendientePersonal,
  } = useGastosFijos();

  // ── Sugerencia de pago ──
  const [sugerencia, setSugerencia] = useState<{
    visible: boolean;
    montoPagado: number;
    clienteNombre: string;
  } | null>(null);

  // Detecta cuando un turno cambia a "presente" con pago
  const turnosAnteriorRef = useRef<typeof turnos>([]);
  useEffect(() => {
    const anterior = turnosAnteriorRef.current;
    if (anterior.length === 0) {
      turnosAnteriorRef.current = turnos;
      return;
    }
    for (const t of turnos) {
      const prev = anterior.find(p => p.id === t.id);
      if (
        t.asistencia === 'presente' &&
        (t.seña_pagada ?? 0) > 0 &&
        (!prev || prev.asistencia !== 'presente' || (prev.seña_pagada ?? 0) !== (t.seña_pagada ?? 0))
      ) {
        const pendientes: GastoFijo[] = [
          ...gastosFijosEmpresa.filter(g => !g.pagado),
          ...gastosFijosPersonal.filter(g => !g.pagado),
        ];
        if (pendientes.length > 0) {
          setSugerencia({ visible: true, montoPagado: t.seña_pagada ?? 0, clienteNombre: t.clienteNombre });
        }
        break;
      }
    }
    turnosAnteriorRef.current = turnos;
  }, [turnos, gastosFijosEmpresa, gastosFijosPersonal]);

  // ── Estado local para recuperar reporte ──
  const [fechaRecuperar, setFechaRecuperar] = useState('');
  const [recuperando, setRecuperando] = useState(false);
  const [mensajeRecuperar, setMensajeRecuperar] = useState('');

  const fechasHabilitadas = useFechasHabilitadas();

  // Fecha anterior y siguiente
  const fechaObj = new Date(fecha + 'T12:00:00');
  const prevDate = new Date(fechaObj); prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(fechaObj); nextDate.setDate(nextDate.getDate() + 1);
  const prevStr = prevDate.toISOString().split('T')[0];
  const nextStr = nextDate.toISOString().split('T')[0];

  const fechaLabel = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());

  // Cerrar + guardar + descargar .txt — todo en uno
  const handleCerrarYGuardar = async () => {
    const ok = await cerrarYGuardar();
    if (ok) {
      mostrar('Caja cerrada y guardada', 'exito', 'El resumen del día llegó al servidor ✓');
      setFechaRecuperar(fecha);
      const contenido = generarReporteTxt(fecha, turnos, gastos, totales, gastosFijosEmpresa, gastosFijosPersonal);
      descargarReporte(contenido, fecha);
    } else {
      mostrar('Error al guardar caja', 'error', 'Verificá la conexión con el servidor');
    }
  };

  // Solo descargar .txt del día actual (sin cerrar)
  const handleDescargarHoy = () => {
    const contenido = generarReporteTxt(fecha, turnos, gastos, totales, gastosFijosEmpresa, gastosFijosPersonal);
    descargarReporte(contenido, fecha);
  };

  // Recuperar reporte de un día pasado desde PostgreSQL
  const handleRecuperar = async () => {
    if (!fechaRecuperar) return;
    setRecuperando(true);
    setMensajeRecuperar('');

    const resultado = await recuperarReporte(fechaRecuperar);

    if (resultado.encontrado && resultado.turnos && resultado.totales) {
      const contenido = generarReporteTxt(
        fechaRecuperar,
        resultado.turnos,
        resultado.gastos ?? [],
        resultado.totales
      );
      descargarReporte(contenido, fechaRecuperar);
      setMensajeRecuperar(`✅ Reporte de ${fechaRecuperar} descargado`);
    } else {
      setMensajeRecuperar(`⚠️ No se encontró caja para ${fechaRecuperar}`);
    }

    setRecuperando(false);
    setTimeout(() => setMensajeRecuperar(''), 5000);
  };

  return (
    <div className="space-y-3">

      {/* ── Header ── */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="hidden md:block text-xl font-bold">💰 Control de Caja</h1>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
            {fechaLabel}
            {!esHoy && (
              <Link href="/admin/panel-control/caja"
                className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline">
                → Ir a hoy
              </Link>
            )}
            {estadoCaja === 'cerrada' && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-semibold">
                🔒 Cerrada
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={cargarTurnos}
            title="Refrescar turnos de la secretaria"
            className="text-xs px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            🔄
          </button>
          <Link
            href="/admin/panel-control"
            className="text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded"
          >
            ← Panel
          </Link>
        </div>
      </div>

      {/* ── Fechas habilitadas — acceso rápido ── */}
      {fechasHabilitadas.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {fechasHabilitadas.map(({ fecha: f, servicios }) => {
            const esSeleccionada = f === fecha;
            const label = new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            return (
              <Link key={f} href={`/admin/panel-control/caja?fecha=${f}`}
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

      {/* ── Navegación entre días ── */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 rounded-2xl px-3 py-2 border border-slate-100 dark:border-slate-700 shadow-sm">
        <Link
          href={`/admin/panel-control/caja?fecha=${prevStr}`}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Anterior
        </Link>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
          {esHoy ? '📅 Hoy' : fecha}
        </span>
        <Link
          href={`/admin/panel-control/caja?fecha=${nextStr}`}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
        >
          Siguiente
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </Link>
      </div>

      <div className="space-y-3">

      {/* ── Estadísticas — franja compacta ── */}
      <div className="flex divide-x divide-slate-200 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase shrink-0">💰 Ingresos</span>
          <span className="text-xs font-bold font-mono text-emerald-800 dark:text-emerald-200">{formatearDinero(totales.ingresos_totales)}</span>
          <span className="text-[10px] text-slate-400 ml-auto">{totales.turnos_presentes} cob.</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5">
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase shrink-0">💸 Gastos</span>
          <span className="text-xs font-bold font-mono text-red-800 dark:text-red-200">{formatearDinero(totales.gastos_totales)}</span>
          <span className="text-[10px] text-slate-400 ml-auto">{gastos.length} gs.</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5">
          <span className={`text-[10px] font-bold uppercase shrink-0 ${totales.ganancia_neta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>📈 Ganancia</span>
          <span className={`text-xs font-bold font-mono ${totales.ganancia_neta >= 0 ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'}`}>{formatearDinero(totales.ganancia_neta)}</span>
        </div>
      </div>

      {/* ── Turnos del día (solo lectura) ── */}
      <section>
        <div className="flex justify-between items-center mb-1.5">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            📅 Turnos del día ({totales.turnos_total})
          </h2>
          <span className="text-[10px] text-slate-400">
            {totales.turnos_presentes} presente · {totales.turnos_ausentes} no vino
          </span>
        </div>

        {turnos.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-center text-sm text-slate-400">
            La secretaria no cargó turnos todavía.
            <button onClick={cargarTurnos} className="block mx-auto mt-1 text-blue-600 dark:text-blue-400 hover:underline text-xs">
              🔄 Reintentar
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg">
            <div className="min-w-[540px] space-y-1">
              <div className="grid grid-cols-[50px_120px_1fr_68px_68px_44px_40px] gap-x-2 px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                <span>Hora</span><span>Clienta</span><span>Tratamiento</span>
                <span className="text-right">Total</span>
                <span className="text-right">Cobrado</span>
                <span className="text-center text-orange-500">Forma</span>
                <span className="text-center">Est.</span>
              </div>
              {turnos.slice().sort((a, b) => a.horario.localeCompare(b.horario)).map((t, idx) => (
                <div key={t.id} className={`grid grid-cols-[50px_120px_1fr_68px_68px_44px_40px] gap-x-2 items-center px-3 py-1 rounded-lg text-sm ${
                  t.asistencia === 'no_vino'
                    ? 'bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 opacity-70'
                    : idx % 2 === 0
                      ? 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'
                      : 'bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-600'
                }`}>
                  <span className="font-mono text-xs text-slate-500">{formatearHora(t.horario)}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-xs truncate">{t.clienteNombre}</p>
                    {t.detalle && <p className="text-[10px] text-slate-400 italic truncate">{t.detalle}</p>}
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate">{t.tratamiento}</span>
                  <span className="text-right font-mono text-xs">{formatearDinero(t.monto_total)}</span>
                  <span className={`text-right font-mono text-xs font-bold ${t.asistencia === 'presente' ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}`}>
                    {t.asistencia === 'presente' ? formatearDinero(t.seña_pagada) : '—'}
                  </span>
                  {/* Método de pago */}
                  <div className="flex justify-center">
                    {t.asistencia === 'presente' ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        t.metodo_pago === 'efectivo'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : t.metodo_pago === 'transferencia'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                      }`}>
                        {t.metodo_pago === 'efectivo' ? '💵' : t.metodo_pago === 'transferencia' ? '🏦' : '📱'}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </div>
                  {/* Estado */}
                  <div className="flex justify-center">
                    {t.asistencia === 'no_vino' ? (
                      <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">NV</span>
                    ) : t.estado_pago === 'completo' ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">✓</span>
                    ) : t.estado_pago === 'seña' ? (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">⏳</span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">○</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Gastos Fijos (empresa + personal) ── */}
      <PanelGastosFijos
        empresa={gastosFijosEmpresa}
        personal={gastosFijosPersonal}
        onPagar={pagarGastoFijo}
        onReset={resetearGasto}
        onEliminar={eliminarGastoFijo}
        onActualizarMonto={actualizarMonto}
        onActualizarNombre={actualizarNombre}
        onAgregarEmpresa={agregarEmpresa}
        onAgregarPersonal={agregarPersonal}
        totalPendienteEmpresa={totalPendienteEmpresa}
        totalPendientePersonal={totalPendientePersonal}
      />

      {/* ── Gastos del día ── */}
      <section>
        <GastosForm onAgregar={agregarGasto} />
        {gastos.length > 0 && <div className="mt-1.5"><GastosList gastos={gastos} onEliminar={eliminarGasto} /></div>}
      </section>

      {/* ── Cierre de día — resumen profesional ── */}
      <ResumenCierre
        fecha={fecha}
        estadoCaja={estadoCaja}
        totales={totales}
        turnos={turnos}
        gastos={gastos}
        gastosFijosEmpresa={gastosFijosEmpresa}
        gastosFijosPersonal={gastosFijosPersonal}
      />

      {/* ── Botones de acción — fuera del recuadro ── */}
      <div className="flex gap-2">
        <button
          onClick={handleDescargarHoy}
          disabled={turnos.length === 0 && gastos.length === 0}
          className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          📥 Descargar .txt
        </button>
        {estadoCaja === 'abierta' ? (
          <button
            onClick={handleCerrarYGuardar}
            disabled={guardando}
            className="flex-1 px-3 py-1.5 rounded-lg bg-red-600 dark:bg-red-700 text-white font-bold text-xs hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {guardando ? '⏳ Guardando...' : '🔒 Cerrar Caja — Guardar y Descargar'}
          </button>
        ) : (
          <button
            onClick={reabrirDia}
            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-500 dark:bg-slate-600 text-white font-bold text-xs hover:bg-slate-600 transition-colors"
          >
            🔓 Reabrir Caja
          </button>
        )}
      </div>

      {/* ── Recuperar reporte pasado — una línea ── */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide shrink-0">🗄️ Reporte anterior</span>
        <input type="date" value={fechaRecuperar} onChange={e => setFechaRecuperar(e.target.value)} max={hoy}
          className="flex-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" />
        <button onClick={handleRecuperar} disabled={!fechaRecuperar || recuperando}
          className="px-2.5 py-0.5 rounded-lg bg-slate-600 dark:bg-slate-500 text-white font-bold text-xs hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0">
          {recuperando ? '⏳' : '📋 Descargar'}
        </button>
        {mensajeRecuperar && <span className="text-[10px] text-slate-500">{mensajeRecuperar}</span>}
      </div>

      </div>

      {/* ── Sugerencia de pago a gastos fijos ── */}
      {sugerencia?.visible && (
        <SugerenciaPago
          montoPagado={sugerencia.montoPagado}
          clienteNombre={sugerencia.clienteNombre}
          gastosPendientes={[
            ...gastosFijosEmpresa.filter(g => !g.pagado),
            ...gastosFijosPersonal.filter(g => !g.pagado),
          ]}
          onAplicar={pagarGastoFijo}
          onCerrar={() => setSugerencia(null)}
        />
      )}

    </div>
  );
}

export default function CajaPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Cargando caja...</p>
      </div>
    }>
      <CajaContent />
    </Suspense>
  );
}
