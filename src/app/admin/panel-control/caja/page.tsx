'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCajaDiaria } from './hooks/useCajaDiaria';
import { useToast } from '@/components/Toast';
import { generarReporteTxt, descargarReporte } from './utils/reporteGenerator';
import { formatearDinero, formatearFecha, formatearHora } from './utils/formatters';
import GastosForm from './components/GastosForm';
import GastosList from './components/GastosList';

const ZOOM_CAJA_STEPS = [0.8, 0.9, 1, 1.15, 1.3, 1.5];
const ZOOM_CAJA_KEY = 'ganesha_caja_zoom';

export default function CajaPage() {
  const hoy = new Date().toISOString().split('T')[0];
  const { mostrar } = useToast();
  const [zoomIdx, setZoomIdx] = useState(() => {
    try { const s = localStorage.getItem(ZOOM_CAJA_KEY); return s ? Number(s) : 2; } catch { return 2; }
  });
  const zoom = ZOOM_CAJA_STEPS[zoomIdx];
  const zoomMenos = () => setZoomIdx(i => { const n = Math.max(0, i - 1); try { localStorage.setItem(ZOOM_CAJA_KEY, String(n)); } catch {} return n; });
  const zoomMas   = () => setZoomIdx(i => { const n = Math.min(ZOOM_CAJA_STEPS.length - 1, i + 1); try { localStorage.setItem(ZOOM_CAJA_KEY, String(n)); } catch {} return n; });

  const {
    turnos,
    gastos,
    totales,
    estadoCaja,
    mensaje,
    guardando,
    agregarGasto,
    eliminarGasto,
    cerrarYGuardar,
    reabrirDia,
    cargarTurnos,
    recuperarReporte,
  } = useCajaDiaria(hoy);

  // ── Estado local para recuperar reporte ──
  const [fechaRecuperar, setFechaRecuperar] = useState('');
  const [recuperando, setRecuperando] = useState(false);
  const [mensajeRecuperar, setMensajeRecuperar] = useState('');

  // Cerrar + guardar + descargar .txt — todo en uno
  const handleCerrarYGuardar = async () => {
    const ok = await cerrarYGuardar();
    if (ok) {
      mostrar('Caja cerrada y guardada', 'exito', 'El resumen del día llegó al servidor ✓');
      setFechaRecuperar(hoy);
      const contenido = generarReporteTxt(hoy, turnos, gastos, totales);
      descargarReporte(contenido, hoy);
    } else {
      mostrar('Error al guardar caja', 'error', 'Verificá la conexión con el servidor');
    }
  };

  // Solo descargar .txt del día actual (sin cerrar)
  const handleDescargarHoy = () => {
    const contenido = generarReporteTxt(hoy, turnos, gastos, totales);
    descargarReporte(contenido, hoy);
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
          <h1 className="text-xl font-bold">💰 Control de Caja</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatearFecha(new Date(hoy + 'T00:00:00'))}
            {estadoCaja === 'cerrada' && (
              <span className="ml-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-semibold">
                🔒 Cerrada
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Zoom */}
          <div className="flex items-center gap-0.5">
            <button onClick={zoomMenos} disabled={zoomIdx === 0}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 disabled:opacity-30 transition-colors">A-</button>
            <span className="text-[10px] text-slate-400 w-8 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={zoomMas} disabled={zoomIdx === ZOOM_CAJA_STEPS.length - 1}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 disabled:opacity-30 transition-colors">A+</button>
          </div>
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

      {/* ── Mensaje feedback ── */}
      {mensaje && (
        <div className="px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-sm text-blue-800 dark:text-blue-200">
          {mensaje}
        </div>
      )}

      {/* ── Zona con zoom (stats + gastos + cierre) ── */}
      <div style={{ fontSize: `${zoom}em` }} className="space-y-3">

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
          <span className={`text-[10px] font-bold uppercase shrink-0 ${totales.ganancia_neta >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>📈 Ganancia</span>
          <span className={`text-xs font-bold font-mono ${totales.ganancia_neta >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'}`}>{formatearDinero(totales.ganancia_neta)}</span>
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

      {/* ── Gastos del día ── */}
      <section>
        <GastosForm onAgregar={agregarGasto} />
        {gastos.length > 0 && <div className="mt-1.5"><GastosList gastos={gastos} onEliminar={eliminarGasto} /></div>}
      </section>

      {/* ── Cierre de día — solo datos ── */}
      <section className="px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10">
        <div className="flex items-center gap-4">
          <span className="text-[9px] font-bold text-purple-500 uppercase tracking-wide shrink-0">🔒 Cierre</span>
          <div className="flex gap-4 text-xs flex-1">
            <div>
              <p className="text-[9px] text-purple-400 uppercase">Estado</p>
              <p className={`font-bold text-xs ${estadoCaja === 'cerrada' ? 'text-red-600' : 'text-green-600'}`}>
                {estadoCaja === 'cerrada' ? '🔒 Cerrada' : '🔓 Abierta'}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-purple-400 uppercase">Ingresos</p>
              <p className="font-bold text-purple-900 dark:text-purple-100">{formatearDinero(totales.ingresos_totales)}</p>
            </div>
            <div>
              <p className="text-[9px] text-purple-400 uppercase">Gastos</p>
              <p className="font-bold text-purple-900 dark:text-purple-100">{formatearDinero(totales.gastos_totales)}</p>
            </div>
            <div>
              <p className="text-[9px] text-purple-400 uppercase">Ganancia</p>
              <p className="font-bold text-purple-900 dark:text-purple-100">{formatearDinero(totales.ganancia_neta)}</p>
            </div>
            {totales.ingresos_totales > 0 && (
              <div className="flex gap-1 items-center ml-2">
                <span className="px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold">💵 {formatearDinero(totales.efectivo)}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold">🏦 {formatearDinero(totales.transferencia)}</span>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[9px] font-bold">📱 {formatearDinero(totales.otro)}</span>
              </div>
            )}
          </div>
        </div>
      </section>

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

      </div>{/* fin zona zoom */}

    </div>
  );
}
