'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCajaDiaria } from './hooks/useCajaDiaria';
import { useToast } from '@/components/Toast';
import { generarReporteTxt, descargarReporte } from './utils/reporteGenerator';
import { formatearDinero, formatearFecha, formatearHora } from './utils/formatters';
import GastosForm from './components/GastosForm';
import GastosList from './components/GastosList';

export default function CajaPage() {
  const hoy = new Date().toISOString().split('T')[0];
  const { mostrar } = useToast();

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
    <div className="space-y-5">

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

      {/* ── Tarjetas estadísticas ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 sm:p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">💰 Ingresos</p>
          <p className="text-base sm:text-2xl font-bold text-emerald-900 dark:text-emerald-100 mt-0.5 leading-tight">
            {formatearDinero(totales.ingresos_totales)}
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 hidden sm:block">
            {totales.turnos_presentes} cobrados
          </p>
        </div>

        <div className="p-2 sm:p-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wide">💸 Gastos</p>
          <p className="text-base sm:text-2xl font-bold text-red-900 dark:text-red-100 mt-0.5 leading-tight">
            {formatearDinero(totales.gastos_totales)}
          </p>
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5 hidden sm:block">
            {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'}
          </p>
        </div>

        <div className={`p-2 sm:p-3 rounded-xl border ${
          totales.ganancia_neta >= 0
            ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
            : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
        }`}>
          <p className={`text-[10px] font-bold uppercase tracking-wide ${
            totales.ganancia_neta >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'
          }`}>
            📈 Ganancia
          </p>
          <p className={`text-base sm:text-2xl font-bold mt-0.5 leading-tight ${
            totales.ganancia_neta >= 0 ? 'text-blue-900 dark:text-blue-100' : 'text-orange-900 dark:text-orange-100'
          }`}>
            {formatearDinero(totales.ganancia_neta)}
          </p>
          <p className={`text-[10px] mt-0.5 hidden sm:block ${
            totales.ganancia_neta >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
          }`}>
            {totales.ganancia_neta >= 0 ? '✓ Positivo' : '⚠ Negativo'}
          </p>
        </div>
      </div>

      {/* ── Turnos del día (solo lectura) ── */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            📅 Turnos del día ({totales.turnos_total})
          </h2>
          <span className="text-xs text-slate-400">
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
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-2">
          💸 Gastos del día
        </h2>
        <GastosForm onAgregar={agregarGasto} />
        {gastos.length > 0 && <div className="mt-3"><GastosList gastos={gastos} onEliminar={eliminarGasto} /></div>}
      </section>

      {/* ── Cierre de día ── */}
      <section className="p-4 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10">
        <h2 className="text-sm font-bold text-purple-800 dark:text-purple-300 mb-3">🔒 Cierre de Caja</h2>

        {/* Resumen final */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
          <div>
            <p className="text-purple-600 dark:text-purple-400">Estado</p>
            <p className={`font-bold ${estadoCaja === 'cerrada' ? 'text-red-600' : 'text-green-600'}`}>
              {estadoCaja === 'cerrada' ? '🔒 Cerrada' : '🔓 Abierta'}
            </p>
          </div>
          <div>
            <p className="text-purple-600 dark:text-purple-400">Ingresos</p>
            <p className="font-bold text-purple-900 dark:text-purple-100">{formatearDinero(totales.ingresos_totales)}</p>
          </div>
          <div>
            <p className="text-purple-600 dark:text-purple-400">Gastos</p>
            <p className="font-bold text-purple-900 dark:text-purple-100">{formatearDinero(totales.gastos_totales)}</p>
          </div>
          <div>
            <p className="text-purple-600 dark:text-purple-400">Ganancia neta</p>
            <p className="font-bold text-purple-900 dark:text-purple-100 text-base">{formatearDinero(totales.ganancia_neta)}</p>
          </div>
        </div>

        {/* Desglose por método de pago */}
        {totales.ingresos_totales > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2 border border-green-200 dark:border-green-800">
              <p className="text-green-700 dark:text-green-400 font-bold">💵 Efectivo</p>
              <p className="font-extrabold text-green-900 dark:text-green-100 text-sm mt-0.5">{formatearDinero(totales.efectivo)}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl px-3 py-2 border border-blue-200 dark:border-blue-800">
              <p className="text-blue-700 dark:text-blue-400 font-bold">🏦 Transferencia</p>
              <p className="font-extrabold text-blue-900 dark:text-blue-100 text-sm mt-0.5">{formatearDinero(totales.transferencia)}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
              <p className="text-slate-600 dark:text-slate-400 font-bold">📱 Otro</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 text-sm mt-0.5">{formatearDinero(totales.otro)}</p>
            </div>
          </div>
        )}

        {/* Botones cierre */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Descargar sin cerrar */}
          <button
            onClick={handleDescargarHoy}
            disabled={turnos.length === 0 && gastos.length === 0}
            className="flex-1 px-4 py-2.5 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            📥 Descargar .txt
          </button>

          {/* BOTÓN PRINCIPAL: Cerrar + Guardar + Descargar */}
          {estadoCaja === 'abierta' ? (
            <button
              onClick={handleCerrarYGuardar}
              disabled={guardando}
              className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 dark:bg-red-700 text-white font-bold text-sm hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {guardando ? '⏳ Guardando...' : '🔒 Cerrar Caja — Guardar y Descargar'}
            </button>
          ) : (
            <button
              onClick={reabrirDia}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-500 dark:bg-slate-600 text-white font-bold text-sm hover:bg-slate-600 transition-colors"
            >
              🔓 Reabrir Caja
            </button>
          )}
        </div>
      </section>

      {/* ── Recuperar reporte pasado desde PostgreSQL ── */}
      <section className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
          🗄️ Recuperar reporte pasado
        </h2>
        <p className="text-xs text-slate-400 mb-3">
          Elegí una fecha y descargás el .txt guardado en el servidor
        </p>

        <div className="flex gap-2">
          <input
            type="date"
            value={fechaRecuperar}
            onChange={e => setFechaRecuperar(e.target.value)}
            max={hoy}
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm"
          />
          <button
            onClick={handleRecuperar}
            disabled={!fechaRecuperar || recuperando}
            className="px-4 py-2 rounded-lg bg-slate-700 dark:bg-slate-600 text-white font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-500 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            {recuperando ? '⏳...' : '📋 Descargar'}
          </button>
        </div>

        {mensajeRecuperar && (
          <p className="text-xs mt-2 text-slate-600 dark:text-slate-400">{mensajeRecuperar}</p>
        )}
      </section>

    </div>
  );
}
