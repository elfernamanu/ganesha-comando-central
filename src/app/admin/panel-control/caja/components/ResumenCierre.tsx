'use client';

import type { TurnoSecretaria, TotalesCaja } from '../hooks/useCajaDiaria';
import type { Gasto } from '../types/index';
import type { GastoFijo } from '../hooks/useGastosFijos';
import { formatearDinero } from '../utils/formatters';

interface Props {
  fecha: string;
  estadoCaja: 'abierta' | 'cerrada';
  totales: TotalesCaja;
  turnos: TurnoSecretaria[];
  gastos: Gasto[];
  gastosFijosEmpresa: GastoFijo[];
  gastosFijosPersonal: GastoFijo[];
}

function fmt(n: number) { return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }); }

function Linea({ label, valor, color = 'slate' }: { label: string; valor: string; color?: 'green' | 'red' | 'slate' | 'blue' }) {
  const colores = {
    green: 'text-green-700 dark:text-green-300 font-black',
    red:   'text-red-700 dark:text-red-300 font-black',
    blue:  'text-blue-700 dark:text-blue-300 font-bold',
    slate: 'text-slate-700 dark:text-slate-200 font-semibold',
  };
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-[12px] font-mono ${colores[color]}`}>{valor}</span>
    </div>
  );
}

export default function ResumenCierre({
  fecha,
  estadoCaja,
  totales,
  turnos,
  gastos,
  gastosFijosEmpresa,
  gastosFijosPersonal,
}: Props) {
  const fechaLabel = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());

  const turnosSorted  = [...turnos].sort((a, b) => a.horario.localeCompare(b.horario));
  const presentes     = turnosSorted.filter(t => t.asistencia === 'presente');
  const ausentes      = turnosSorted.filter(t => t.asistencia === 'no_vino');
  // Cuántos presentes realmente pagaron algo (para el label de la card Ingresos)
  const cobradosCount = presentes.filter(t => (t.seña_pagada ?? 0) > 0).length;

  // Desglose pagos pendientes en gastos fijos
  const empPendiente = gastosFijosEmpresa.filter(g => !g.pagado && g.activo);
  const empPagado    = gastosFijosEmpresa.filter(g => g.pagado  && g.activo);
  const perPendiente = gastosFijosPersonal.filter(g => !g.pagado && g.activo);
  const perPagado    = gastosFijosPersonal.filter(g => g.pagado  && g.activo);

  const totalFijosPendiente =
    empPendiente.reduce((s, g) => s + Math.max(0, g.montoTotal - g.montoAcumulado), 0) +
    perPendiente.reduce((s, g) => s + Math.max(0, g.montoTotal - g.montoAcumulado), 0);

  const gananciaReal = totales.ganancia_neta - totalFijosPendiente;

  return (
    <div className="rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden shadow-md">

      {/* ── Encabezado ── */}
      <div className={`px-4 py-3 ${estadoCaja === 'cerrada' ? 'bg-slate-800 dark:bg-slate-900' : 'bg-violet-700 dark:bg-violet-800'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-black text-sm tracking-wide uppercase">
              {estadoCaja === 'cerrada' ? '🔒 Caja Cerrada' : '📋 Resumen de Caja'}
            </p>
            <p className="text-white/70 text-[11px] font-medium mt-0.5">Ganesha Esthetic — {fechaLabel}</p>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-full ${
            estadoCaja === 'cerrada'
              ? 'bg-red-500 text-white'
              : 'bg-white/20 text-white'
          }`}>
            {estadoCaja === 'cerrada' ? 'CERRADA' : 'ABIERTA'}
          </span>
        </div>
      </div>

      <div className="p-3 space-y-3">

        {/* ── Bloque 1: Totales en 3 columnas ── */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center border border-green-200 dark:border-green-800">
            <p className="text-[9px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">Ingresos</p>
            <p className="text-xl font-black text-green-700 dark:text-green-300 font-mono leading-tight mt-0.5">
              {fmt(totales.ingresos_totales)}
            </p>
            <p className="text-[9px] text-green-500">{cobradosCount} cobrado{cobradosCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center border border-red-200 dark:border-red-800">
            <p className="text-[9px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Gastos Día</p>
            <p className="text-xl font-black text-red-700 dark:text-red-300 font-mono leading-tight mt-0.5">
              {fmt(totales.gastos_totales)}
            </p>
            <p className="text-[9px] text-red-500">{gastos.length} concepto{gastos.length !== 1 ? 's' : ''}</p>
          </div>
          <div className={`rounded-lg p-2 text-center border ${
            totales.ganancia_neta >= 0
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
          }`}>
            <p className={`text-[9px] font-bold uppercase tracking-wide ${
              totales.ganancia_neta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'
            }`}>Ganancia</p>
            <p className={`text-xl font-black font-mono leading-tight mt-0.5 ${
              totales.ganancia_neta >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300'
            }`}>
              {fmt(totales.ganancia_neta)}
            </p>
            <p className={`text-[9px] ${totales.ganancia_neta >= 0 ? 'text-emerald-500' : 'text-orange-500'}`}>
              {totales.ganancia_neta >= 0 ? '✓ positiva' : '⚠ negativa'}
            </p>
          </div>
        </div>

        {/* ── Bloque 2: Formas de cobro ── */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-3 py-1 bg-slate-100 dark:bg-slate-700">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wide">💳 Formas de cobro</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700">
            <div className="px-2 py-1.5 text-center">
              <p className="text-[10px] text-slate-400 font-medium">💵 Efectivo</p>
              <p className="text-base font-black text-green-700 dark:text-green-300 font-mono">{fmt(totales.efectivo)}</p>
            </div>
            <div className="px-2 py-1.5 text-center">
              <p className="text-[10px] text-slate-400 font-medium">🏦 Transf.</p>
              <p className="text-base font-black text-blue-700 dark:text-blue-300 font-mono">{fmt(totales.transferencia)}</p>
            </div>
            <div className="px-2 py-1.5 text-center">
              <p className="text-[10px] text-slate-400 font-medium">📱 Otro</p>
              <p className="text-base font-black text-slate-600 dark:text-slate-300 font-mono">{fmt(totales.otro)}</p>
            </div>
          </div>
        </div>

        {/* ── Bloque 3: Clientes del día ── */}
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-3 py-1 bg-slate-100 dark:bg-slate-700 flex justify-between items-center">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wide">
              👩 Clientes del día ({turnos.length})
            </p>
            <span className="text-[9px] text-slate-400">
              {presentes.length} presente · {ausentes.length} no vino
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {turnosSorted.length === 0 && (
              <p className="text-[11px] text-slate-400 italic text-center py-2">Sin turnos registrados</p>
            )}
            {turnosSorted.map(t => {
              const noVino = t.asistencia === 'no_vino';
              const pagado = t.estado_pago === 'completo';
              return (
                <div key={t.id} className={`grid grid-cols-[1fr_auto_auto_auto] gap-x-2 items-center px-3 py-1 ${
                  noVino ? 'opacity-50 bg-red-50 dark:bg-red-900/10' : pagado ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                }`}>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight">{t.clienteNombre || '—'}</p>
                    <p className="text-[9px] text-slate-400 truncate leading-tight">{t.tratamiento || 'sin servicio'}</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap">{fmt(t.monto_total)}</span>
                  <span className={`text-[11px] font-mono font-bold whitespace-nowrap ${
                    noVino ? 'text-red-500' : pagado ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {noVino
                      ? (t.seña_pagada ?? 0) > 0
                          ? `✗ ${fmt(t.seña_pagada ?? 0)}`   // seña perdida — contabilizada como ingreso
                          : 'No vino'
                      : pagado
                          ? `✓ ${fmt(t.seña_pagada ?? 0)}`
                          : `⏳ ${fmt(t.seña_pagada ?? 0)}`}
                  </span>
                  <span className="text-[10px] font-bold">
                    {noVino ? '' : t.metodo_pago === 'efectivo' ? '💵' : t.metodo_pago === 'transferencia' ? '🏦' : '📱'}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Pendientes de cobro */}
          {presentes.some(t => t.estado_pago !== 'completo') && (
            <div className="px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                ⏳ Saldo pendiente: {fmt(presentes.filter(t => t.estado_pago !== 'completo').reduce((s, t) => s + Math.max(0, t.monto_total - (t.seña_pagada ?? 0)), 0))}
              </p>
            </div>
          )}
        </div>

        {/* ── Bloque 4: Gastos fijos en 2 columnas ── */}
        {(gastosFijosEmpresa.length > 0 || gastosFijosPersonal.length > 0) && (
          <div className="grid grid-cols-2 gap-1.5">
            {/* Empresa */}
            <div className="rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
              <div className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20">
                <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wide">💼 Empresa</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {gastosFijosEmpresa.filter(g => g.activo).length === 0 && (
                  <p className="text-[10px] text-slate-400 italic text-center py-1.5">Sin gastos</p>
                )}
                {gastosFijosEmpresa.filter(g => g.activo).map(g => (
                  <div key={g.id} className="flex justify-between items-center px-2 py-0.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1 mr-1">{g.nombre}</span>
                    {g.pagado ? (
                      <span className="text-[10px] font-black text-green-600 shrink-0">✓</span>
                    ) : g.montoTotal > 0 ? (
                      <span className="text-[11px] font-mono text-red-600 dark:text-red-400 shrink-0 font-bold">
                        -{fmt(g.montoTotal - g.montoAcumulado)}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 shrink-0">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Personal */}
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
              <div className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">🏠 Personal</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {gastosFijosPersonal.filter(g => g.activo).length === 0 && (
                  <p className="text-[10px] text-slate-400 italic text-center py-1.5">Sin gastos</p>
                )}
                {gastosFijosPersonal.filter(g => g.activo).map(g => (
                  <div key={g.id} className="flex justify-between items-center px-2 py-0.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1 mr-1">{g.nombre}</span>
                    {g.pagado ? (
                      <span className="text-[10px] font-black text-green-600 shrink-0">✓</span>
                    ) : g.montoTotal > 0 ? (
                      <span className="text-[11px] font-mono text-red-600 dark:text-red-400 shrink-0 font-bold">
                        -{fmt(g.montoTotal - g.montoAcumulado)}
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 shrink-0">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Bloque 5: Gastos del día ── */}
        {gastos.length > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-3 py-1 bg-slate-100 dark:bg-slate-700">
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wide">🧾 Gastos del día</p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-slate-700">
              {gastos.map(g => (
                <div key={g.id} className="flex justify-between items-center px-3 py-1 bg-white dark:bg-slate-800">
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{g.concepto}</span>
                  <span className="text-[12px] font-mono font-bold text-red-600 dark:text-red-400 ml-2 shrink-0">{fmt(g.monto)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Bloque 6: Ganancia real (descontando fijos pendientes) ── */}
        {totalFijosPendiente > 0 && (
          <div className="rounded-lg border-2 border-slate-300 dark:border-slate-600 p-2 bg-slate-50 dark:bg-slate-700/50">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Pendiente fijos</p>
                <p className="text-lg font-black text-red-600 dark:text-red-400 font-mono leading-tight">-{fmt(totalFijosPendiente)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Ganancia real</p>
                <p className={`text-lg font-black font-mono leading-tight ${gananciaReal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {fmt(gananciaReal)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Pie: Responsable ── */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
          <p className="text-[10px] text-slate-400">
            Responsable: <span className="font-bold text-slate-600 dark:text-slate-300">Mirian G. Francolino</span>
          </p>
          <p className="text-[10px] text-slate-400 font-mono">{fecha}</p>
        </div>
      </div>
    </div>
  );
}
