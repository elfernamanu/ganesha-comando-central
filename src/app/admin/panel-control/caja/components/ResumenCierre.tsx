'use client';

import type { TurnoSecretaria, TotalesCaja } from '../hooks/useCajaDiaria';
import type { Gasto } from '../types/index';
import type { GastoFijo } from '../hooks/useGastosFijos';

interface Props {
  fecha: string;
  estadoCaja: 'abierta' | 'cerrada';
  totales: TotalesCaja;
  turnos: TurnoSecretaria[];
  gastos: Gasto[];
  gastosFijosEmpresa: GastoFijo[];
  gastosFijosPersonal: GastoFijo[];
}

function fmt(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
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

  const presentes = turnos.filter(t => t.asistencia === 'presente');
  const ausentes  = turnos.filter(t => t.asistencia === 'no_vino');

  // Normalizar fijos
  const gEmpresa  = gastosFijosEmpresa.map(g => ({ ...g, montoAcumulado: g.montoAcumulado ?? 0, pagado: g.pagado ?? false }));
  const gPersonal = gastosFijosPersonal.map(g => ({ ...g, montoAcumulado: g.montoAcumulado ?? 0, pagado: g.pagado ?? false }));

  // Pagados
  const empPagados = gEmpresa.filter(g => g.activo && g.pagado);
  const perPagados = gPersonal.filter(g => g.activo && g.pagado);
  const totalFijosPagados =
    empPagados.reduce((s, g) => s + g.montoAcumulado, 0) +
    perPagados.reduce((s, g) => s + g.montoAcumulado, 0);

  // Pendientes (solo los que tienen algo por cobrar)
  const saldoPendiente = (g: typeof gEmpresa[0]) => Math.max(0, g.montoTotal - g.montoAcumulado);
  const empPendientes = gEmpresa.filter(g => g.activo && !g.pagado);
  const perPendientes = gPersonal.filter(g => g.activo && !g.pagado);
  const totalFijosPendiente =
    empPendientes.reduce((s, g) => s + saldoPendiente(g), 0) +
    perPendientes.reduce((s, g) => s + saldoPendiente(g), 0);

  // Ganancia del día (solo ingresos − gastos del día)
  const gananciaDia = totales.ingresos_totales - totales.gastos_totales;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm">

      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <div className={`px-3 py-2 flex items-center justify-between ${
        estadoCaja === 'cerrada' ? 'bg-slate-800 dark:bg-slate-900' : 'bg-violet-700 dark:bg-violet-800'
      }`}>
        <div>
          <p className="text-white font-black text-sm tracking-wide uppercase">
            {estadoCaja === 'cerrada' ? '🔒 Caja Cerrada' : '📋 Resumen de Caja'}
          </p>
          <p className="text-white/60 text-[10px] mt-0.5">Ganesha Esthetic — {fechaLabel}</p>
        </div>
        <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
          estadoCaja === 'cerrada' ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
        }`}>
          {estadoCaja === 'cerrada' ? 'CERRADA' : 'ABIERTA'}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700/60">

        {/* ── 1. INGRESOS ──────────────────────────────────────────────────── */}
        <div className="px-3 py-2.5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">💰 Ingresos del día</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {presentes.length} pres{presentes.length !== 1 ? 'entes' : 'ente'}
                {ausentes.length > 0 && ` · ${ausentes.length} no vino${ausentes.length !== 1 ? 'n' : ''}`}
                {' · '}{turnos.length} turno{turnos.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-3 mt-1">
                {totales.efectivo > 0 && (
                  <span className="text-[10px] text-slate-500">💵 {fmt(totales.efectivo)}</span>
                )}
                {totales.transferencia > 0 && (
                  <span className="text-[10px] text-slate-500">🏦 {fmt(totales.transferencia)}</span>
                )}
                {totales.otro > 0 && (
                  <span className="text-[10px] text-slate-500">📱 {fmt(totales.otro)}</span>
                )}
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono tabular-nums">
              {fmt(totales.ingresos_totales)}
            </p>
          </div>
        </div>

        {/* ── 2. GASTOS DEL DÍA ────────────────────────────────────────────── */}
        {gastos.length > 0 && (
          <div className="px-3 py-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">💸 Gastos del día</p>
            {gastos.map(g => (
              <div key={g.id} className="flex justify-between items-center py-0.5">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex-1">· {g.concepto}</span>
                <span className="text-[11px] font-mono font-bold text-red-500 ml-3 shrink-0">− {fmt(g.monto)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── 3. GANANCIA DEL DÍA ──────────────────────────────────────────── */}
        <div className="px-3 py-2.5 flex justify-between items-center">
          <div>
            <p className={`text-xs font-black uppercase tracking-wide ${
              gananciaDia >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {gananciaDia >= 0 ? '✅ Ganancia del día' : '⚠️ Resultado del día'}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5">Ingresos menos gastos de hoy</p>
          </div>
          <p className={`text-xl font-black font-mono tabular-nums ${
            gananciaDia >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {fmt(gananciaDia)}
          </p>
        </div>

        {/* ── 4. A PAGAR ESTE MES — sección roja prominente ────────────────── */}
        {totalFijosPendiente > 0 && (
          <div>
            {/* Cabecera roja */}
            <div className="flex items-center justify-between px-3 py-2 bg-red-600 dark:bg-red-700">
              <div>
                <p className="text-white font-black text-sm uppercase tracking-wide">⚠️ A pagar este mes</p>
                <p className="text-red-200 text-[9px] mt-0.5">Gastos fijos aún no pagados</p>
              </div>
              <p className="text-white font-black text-xl font-mono tabular-nums">{fmt(totalFijosPendiente)}</p>
            </div>
            {/* Lista */}
            <div className="bg-red-50 dark:bg-red-900/15 divide-y divide-red-100 dark:divide-red-900/30">
              {/* Empresa pendiente */}
              {empPendientes.length > 0 && (
                <>
                  <div className="px-3 py-0.5 bg-red-100/60 dark:bg-red-900/20">
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-wide">💼 Empresa</p>
                  </div>
                  {empPendientes.map(g => {
                    const saldo = saldoPendiente(g);
                    const parcial = g.montoAcumulado > 0;
                    return (
                      <div key={g.id} className="flex justify-between items-center px-3 py-1 pl-5">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-red-800 dark:text-red-200 font-semibold truncate block">{g.nombre}</span>
                          {parcial && (
                            <span className="text-[9px] text-red-400">
                              Pagó {fmt(g.montoAcumulado)} de {fmt(g.montoTotal)}
                            </span>
                          )}
                        </div>
                        <span className={`text-sm font-black font-mono ml-3 shrink-0 ${
                          saldo > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
                        }`}>
                          {saldo > 0 ? fmt(saldo) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
              {/* Personal pendiente */}
              {perPendientes.length > 0 && (
                <>
                  <div className="px-3 py-0.5 bg-red-100/60 dark:bg-red-900/20">
                    <p className="text-[9px] font-black text-red-500 uppercase tracking-wide">🏠 Personal — Mirian G. Francolino</p>
                  </div>
                  {perPendientes.map(g => {
                    const saldo = saldoPendiente(g);
                    const parcial = g.montoAcumulado > 0;
                    return (
                      <div key={g.id} className="flex justify-between items-center px-3 py-1 pl-5">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-red-800 dark:text-red-200 font-semibold truncate block">{g.nombre}</span>
                          {parcial && (
                            <span className="text-[9px] text-red-400">
                              Pagó {fmt(g.montoAcumulado)} de {fmt(g.montoTotal)}
                            </span>
                          )}
                        </div>
                        <span className={`text-sm font-black font-mono ml-3 shrink-0 ${
                          saldo > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'
                        }`}>
                          {saldo > 0 ? fmt(saldo) : '—'}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── 5. YA PAGADOS — compacto, al pie como referencia ─────────────── */}
        {totalFijosPagados > 0 && (
          <div className="px-3 py-2">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">✓ Fijos del mes ya pagados</p>
              <p className="text-[11px] font-black text-green-600 dark:text-green-400 font-mono">{fmt(totalFijosPagados)}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {[...empPagados, ...perPagados].map(g => (
                <span key={g.id} className="text-[10px] text-slate-400">
                  ✓ {g.nombre} <span className="font-mono">{fmt(g.montoAcumulado)}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Pie ──────────────────────────────────────────────────────────── */}
        <div className="px-3 py-1.5 flex items-center justify-between bg-slate-50 dark:bg-slate-700/30">
          <p className="text-[10px] text-slate-400">
            Resp.: <span className="font-bold text-slate-500 dark:text-slate-300">Mirian G. Francolino</span>
          </p>
          <p className="text-[10px] text-slate-400 font-mono">{fecha}</p>
        </div>

      </div>
    </div>
  );
}
