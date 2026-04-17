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

  // Asistencia
  const presentes = turnos.filter(t => t.asistencia === 'presente');
  const ausentes  = turnos.filter(t => t.asistencia === 'no_vino');

  // Normalizar fijos
  const gEmpresa  = gastosFijosEmpresa.map(g => ({ ...g, montoAcumulado: g.montoAcumulado ?? 0, pagado: g.pagado ?? false }));
  const gPersonal = gastosFijosPersonal.map(g => ({ ...g, montoAcumulado: g.montoAcumulado ?? 0, pagado: g.pagado ?? false }));

  // Fijos pagados — son gasto real
  const empPagados = gEmpresa.filter(g => g.activo && g.pagado);
  const perPagados = gPersonal.filter(g => g.activo && g.pagado);
  const totalFijosEmpresaPagado  = empPagados.reduce((s, g) => s + g.montoAcumulado, 0);
  const totalFijosPersonalPagado = perPagados.reduce((s, g) => s + g.montoAcumulado, 0);
  const totalFijosPagados        = totalFijosEmpresaPagado + totalFijosPersonalPagado;

  // Fijos pendientes — deuda futura
  const empPendientes = gEmpresa.filter(g => g.activo && !g.pagado);
  const perPendientes = gPersonal.filter(g => g.activo && !g.pagado);
  const totalFijosPendiente =
    empPendientes.reduce((s, g) => s + Math.max(0, g.montoTotal - g.montoAcumulado), 0) +
    perPendientes.reduce((s, g) => s + Math.max(0, g.montoTotal - g.montoAcumulado), 0);

  // Cálculos finales
  const totalGastos   = totales.gastos_totales + totalFijosPagados;
  const gananciaNeta  = totales.ingresos_totales - totalGastos;
  const gananciaReal  = gananciaNeta - totalFijosPendiente;

  return (
    <div className="rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden shadow-md">

      {/* ── Encabezado ── */}
      <div className={`px-3 py-2 ${estadoCaja === 'cerrada' ? 'bg-slate-800 dark:bg-slate-900' : 'bg-violet-700 dark:bg-violet-800'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-black text-sm tracking-wide uppercase">
              {estadoCaja === 'cerrada' ? '🔒 Caja Cerrada' : '📋 Resumen de Caja'}
            </p>
            <p className="text-white/70 text-[11px] font-medium mt-0.5">Ganesha Esthetic — {fechaLabel}</p>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-full ${
            estadoCaja === 'cerrada' ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
          }`}>
            {estadoCaja === 'cerrada' ? 'CERRADA' : 'ABIERTA'}
          </span>
        </div>
      </div>

      <div className="p-2 space-y-1.5">

        {/* ══ 1. INGRESOS ═══════════════════════════════════════════════════ */}
        <div className="rounded-xl border-2 border-green-200 dark:border-green-800 overflow-hidden">
          {/* Monto cobrado */}
          <div className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-900/20">
            <div>
              <p className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-wide">💰 INGRESOS DEL DÍA</p>
              <p className="text-[9px] text-green-600 dark:text-green-500 mt-0.5">
                {presentes.length} presente{presentes.length !== 1 ? 's' : ''}
                {ausentes.length > 0 && ` · ${ausentes.length} no vino${ausentes.length !== 1 ? 'n' : ''}`}
                {' · '}{turnos.length} turno{turnos.length !== 1 ? 's' : ''} en total
              </p>
            </div>
            <p className="text-2xl font-black text-green-700 dark:text-green-300 font-mono">{fmt(totales.ingresos_totales)}</p>
          </div>
          {/* Formas de cobro */}
          <div className="grid grid-cols-3 divide-x divide-green-100 dark:divide-green-900 border-t border-green-100 dark:border-green-900">
            <div className="px-2 py-1 text-center">
              <p className="text-[9px] text-green-600 dark:text-green-500 font-medium">💵 Efectivo</p>
              <p className="text-sm font-black text-green-700 dark:text-green-300 font-mono">{fmt(totales.efectivo)}</p>
            </div>
            <div className="px-2 py-1 text-center">
              <p className="text-[9px] text-green-600 dark:text-green-500 font-medium">🏦 Transf.</p>
              <p className="text-sm font-black text-green-700 dark:text-green-300 font-mono">{fmt(totales.transferencia)}</p>
            </div>
            <div className="px-2 py-1 text-center">
              <p className="text-[9px] text-green-600 dark:text-green-500 font-medium">📱 Otro</p>
              <p className="text-sm font-black text-green-700 dark:text-green-300 font-mono">{fmt(totales.otro)}</p>
            </div>
          </div>
        </div>

        {/* ══ 2. GASTOS DEL DÍA ═════════════════════════════════════════════ */}
        {gastos.length > 0 && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
              <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wide">💸 GASTOS DEL DÍA</p>
              <p className="text-sm font-black text-red-600 dark:text-red-400 font-mono">− {fmt(totales.gastos_totales)}</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {gastos.map(g => (
                <div key={g.id} className="flex justify-between items-center px-3 py-1">
                  <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1">· {g.concepto}</span>
                  <span className="text-[11px] font-mono font-bold text-red-500 dark:text-red-400 ml-2 shrink-0">{fmt(g.monto)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ 3. GASTOS FIJOS PAGADOS ════════════════════════════════════════ */}
        {totalFijosPagados > 0 && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
              <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase tracking-wide">📋 GASTOS FIJOS PAGADOS</p>
              <p className="text-sm font-black text-red-600 dark:text-red-400 font-mono">− {fmt(totalFijosPagados)}</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {/* Empresa */}
              {empPagados.length > 0 && (
                <>
                  <div className="px-3 py-0.5 bg-slate-50 dark:bg-slate-700/40">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">💼 Empresa</p>
                  </div>
                  {empPagados.map(g => (
                    <div key={g.id} className="flex justify-between items-center px-3 py-0.5 pl-5">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1">✓ {g.nombre}</span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 ml-2 shrink-0">{fmt(g.montoAcumulado)}</span>
                    </div>
                  ))}
                </>
              )}
              {/* Personal */}
              {perPagados.length > 0 && (
                <>
                  <div className="px-3 py-0.5 bg-slate-50 dark:bg-slate-700/40">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">🏠 Personal — Mirian G. Francolino</p>
                  </div>
                  {perPagados.map(g => (
                    <div key={g.id} className="flex justify-between items-center px-3 py-0.5 pl-5">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1">✓ {g.nombre}</span>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 ml-2 shrink-0">{fmt(g.montoAcumulado)}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {/* ══ 4. TOTAL GASTOS + GANANCIA NETA ═══════════════════════════════ */}
        <div className="rounded-xl border-2 border-slate-300 dark:border-slate-600 overflow-hidden">
          {/* Total gastos (solo si hay alguno) */}
          {totalGastos > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total gastos</p>
              <p className="text-sm font-black text-red-600 dark:text-red-400 font-mono">− {fmt(totalGastos)}</p>
            </div>
          )}
          {/* Ganancia neta — barra grande */}
          <div className={`flex items-center justify-between px-3 py-3 ${
            gananciaNeta >= 0 ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-red-600 dark:bg-red-700'
          }`}>
            <p className="text-sm font-black text-white uppercase tracking-wide">
              {gananciaNeta >= 0 ? '✅ GANANCIA NETA' : '⚠️ RESULTADO'}
            </p>
            <p className="text-2xl font-black text-white font-mono">{fmt(gananciaNeta)}</p>
          </div>
        </div>

        {/* ══ 5. FIJOS PENDIENTES (si los hay) ══════════════════════════════ */}
        {totalFijosPendiente > 0 && (
          <div className="rounded-lg border-2 border-amber-300 dark:border-amber-700 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
              <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wide">⚠️ FIJOS AÚN NO PAGADOS ESTE MES</p>
              <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">− {fmt(totalFijosPendiente)}</p>
            </div>
            <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
              {/* Empresa pendiente */}
              {empPendientes.length > 0 && (
                <>
                  <div className="px-3 py-0.5 bg-amber-50/60 dark:bg-amber-900/10">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">💼 Empresa</p>
                  </div>
                  {empPendientes.map(g => (
                    <div key={g.id} className="flex justify-between items-center px-3 py-0.5 pl-5">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1">⏳ {g.nombre}</span>
                      <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 ml-2 shrink-0">
                        {fmt(Math.max(0, g.montoTotal - g.montoAcumulado))}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {/* Personal pendiente */}
              {perPendientes.length > 0 && (
                <>
                  <div className="px-3 py-0.5 bg-amber-50/60 dark:bg-amber-900/10">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">🏠 Personal — Mirian G. Francolino</p>
                  </div>
                  {perPendientes.map(g => (
                    <div key={g.id} className="flex justify-between items-center px-3 py-0.5 pl-5">
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1">⏳ {g.nombre}</span>
                      <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 ml-2 shrink-0">
                        {fmt(Math.max(0, g.montoTotal - g.montoAcumulado))}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
            {/* Ganancia real si se pagan los pendientes */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-600">
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Si también se pagan:</p>
              <p className={`text-base font-black font-mono ${
                gananciaReal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {fmt(gananciaReal)}
              </p>
            </div>
          </div>
        )}

        {/* ── Pie ── */}
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
