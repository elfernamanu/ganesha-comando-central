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

const f = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

export default function ResumenCierre({
  fecha, estadoCaja, totales, turnos, gastos, gastosFijosEmpresa, gastosFijosPersonal,
}: Props) {
  const fechaLabel = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());

  const presentes = turnos.filter(t => t.asistencia === 'presente').length;
  const ausentes  = turnos.filter(t => t.asistencia === 'no_vino').length;

  const gEmp = gastosFijosEmpresa.map(g => ({ ...g, montoAcumulado: g.montoAcumulado ?? 0, pagado: g.pagado ?? false }));
  const gPer = gastosFijosPersonal.map(g => ({ ...g, montoAcumulado: g.montoAcumulado ?? 0, pagado: g.pagado ?? false }));

  const empPag = gEmp.filter(g => g.activo && g.pagado);
  const perPag = gPer.filter(g => g.activo && g.pagado);
  const empPen = gEmp.filter(g => g.activo && !g.pagado);
  const perPen = gPer.filter(g => g.activo && !g.pagado);

  const saldo = (g: typeof gEmp[0]) => Math.max(0, g.montoTotal - g.montoAcumulado);

  const totalPagados   = [...empPag, ...perPag].reduce((s, g) => s + g.montoAcumulado, 0);
  const totalPendiente = [...empPen, ...perPen].reduce((s, g) => s + saldo(g), 0);
  const gananciaDia    = totales.ingresos_totales - totales.gastos_totales;

  // ── fila compacta ──────────────────────────────────────────────────────────
  const Row = ({ label, valor, sub, red }: { label: string; valor: string; sub?: string; red?: boolean }) => (
    <div className="flex justify-between items-center py-[3px]">
      <div>
        <span className={`text-[11px] ${red ? 'text-red-700 dark:text-red-300 font-semibold' : 'text-slate-600 dark:text-slate-300'}`}>{label}</span>
        {sub && <span className="ml-1.5 text-[9px] text-slate-400">{sub}</span>}
      </div>
      <span className={`text-[11px] font-mono font-bold tabular-nums ${red ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>{valor}</span>
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden text-[11px]">

      {/* Encabezado */}
      <div className={`px-3 py-1.5 flex items-center justify-between ${
        estadoCaja === 'cerrada' ? 'bg-slate-800 dark:bg-slate-900' : 'bg-violet-700'
      }`}>
        <div>
          <p className="text-white font-bold text-[11px] uppercase tracking-wide">
            {estadoCaja === 'cerrada' ? '🔒 Caja Cerrada' : '📋 Resumen'} — {fechaLabel}
          </p>
        </div>
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
          estadoCaja === 'cerrada' ? 'bg-red-500 text-white' : 'bg-white/20 text-white'
        }`}>
          {estadoCaja === 'cerrada' ? 'CERRADA' : 'ABIERTA'}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">

        {/* ── Ingresos ────────────────────────────────────────────────────── */}
        <div className="px-3 py-1.5">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">💰 Ingresos del día</span>
              <span className="ml-2 text-[9px] text-slate-400">
                {presentes} pres · {ausentes} no vino · {turnos.length} turnos
              </span>
            </div>
            <span className="text-base font-black text-slate-800 dark:text-slate-100 font-mono tabular-nums">{f(totales.ingresos_totales)}</span>
          </div>
          <div className="flex gap-3 mt-0.5">
            {totales.efectivo      > 0 && <span className="text-[9px] text-slate-400">💵 {f(totales.efectivo)}</span>}
            {totales.transferencia > 0 && <span className="text-[9px] text-slate-400">🏦 {f(totales.transferencia)}</span>}
            {totales.otro          > 0 && <span className="text-[9px] text-slate-400">📱 {f(totales.otro)}</span>}
          </div>
        </div>

        {/* ── Gastos del día ──────────────────────────────────────────────── */}
        {gastos.length > 0 && (
          <div className="px-3 py-1">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-0.5">💸 Gastos del día</p>
            {gastos.map(g => (
              <div key={g.id} className="flex justify-between py-[2px]">
                <span className="text-[10px] text-slate-500 truncate flex-1">· {g.concepto}</span>
                <span className="text-[10px] font-mono text-red-500 ml-2 shrink-0">−{f(g.monto)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Ganancia del día ─────────────────────────────────────────────── */}
        <div className="px-3 py-1.5 flex justify-between items-center">
          <div>
            <span className={`text-[11px] font-black uppercase tracking-wide ${
              gananciaDia >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'
            }`}>
              {gananciaDia >= 0 ? '✅ Ganancia del día' : '⚠️ Resultado del día'}
            </span>
            <span className="ml-1.5 text-[9px] text-slate-400">ingresos − gastos de hoy</span>
          </div>
          <span className={`text-base font-black font-mono tabular-nums ${
            gananciaDia >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600'
          }`}>
            {f(gananciaDia)}
          </span>
        </div>

        {/* ── A PAGAR ESTE MES ─────────────────────────────────────────────── */}
        {totalPendiente > 0 && (
          <>
            {/* Cabecera roja compacta */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-red-600 dark:bg-red-700">
              <span className="text-[11px] font-black text-white uppercase tracking-wide">⚠️ A pagar este mes</span>
              <span className="text-sm font-black text-white font-mono tabular-nums">{f(totalPendiente)}</span>
            </div>
            {/* Lista pendientes */}
            <div className="px-3 py-1 bg-red-50 dark:bg-red-900/15 space-y-0">
              {empPen.length > 0 && (
                <>
                  <p className="text-[9px] font-black text-red-400 uppercase tracking-wide pt-0.5">💼 Empresa</p>
                  {empPen.map(g => (
                    <div key={g.id} className="flex justify-between items-center py-[2px] pl-2">
                      <div>
                        <span className="text-[11px] text-red-800 dark:text-red-200 font-medium">{g.nombre}</span>
                        {g.montoAcumulado > 0 && (
                          <span className="ml-1.5 text-[9px] text-red-400">pagó {f(g.montoAcumulado)} de {f(g.montoTotal)}</span>
                        )}
                      </div>
                      <span className={`text-[11px] font-mono font-bold ml-2 shrink-0 ${saldo(g) > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                        {saldo(g) > 0 ? f(saldo(g)) : '—'}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {perPen.length > 0 && (
                <>
                  <p className="text-[9px] font-black text-red-400 uppercase tracking-wide pt-0.5">🏠 Personal</p>
                  {perPen.map(g => (
                    <div key={g.id} className="flex justify-between items-center py-[2px] pl-2">
                      <div>
                        <span className="text-[11px] text-red-800 dark:text-red-200 font-medium">{g.nombre}</span>
                        {g.montoAcumulado > 0 && (
                          <span className="ml-1.5 text-[9px] text-red-400">pagó {f(g.montoAcumulado)} de {f(g.montoTotal)}</span>
                        )}
                      </div>
                      <span className={`text-[11px] font-mono font-bold ml-2 shrink-0 ${saldo(g) > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                        {saldo(g) > 0 ? f(saldo(g)) : '—'}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}

        {/* ── Fijos ya pagados — amarillo si hay pendientes, verde si está todo al día ── */}
        {totalPagados > 0 && (
          <div className={`px-3 py-1.5 ${
            totalPendiente === 0
              ? 'bg-green-50 dark:bg-green-900/15'
              : 'bg-amber-50 dark:bg-amber-900/15'
          }`}>
            <div className="flex justify-between items-center">
              <span className={`text-[9px] font-black uppercase tracking-wide ${
                totalPendiente === 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {totalPendiente === 0 ? '✅ Todo al día — fijos del mes pagados' : '✅ Ya pagado este mes — aún quedan gastos pendientes'}
              </span>
              <span className={`text-[10px] font-black font-mono ${
                totalPendiente === 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}>{f(totalPagados)}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 mt-0.5">
              {[...empPag, ...perPag].map(g => (
                <span key={g.id} className={`text-[9px] ${
                  totalPendiente === 0 ? 'text-green-600 dark:text-green-500' : 'text-amber-600 dark:text-amber-500'
                }`}>✓ {g.nombre} <span className="font-mono">{f(g.montoAcumulado)}</span></span>
              ))}
            </div>
          </div>
        )}

        {/* Pie */}
        <div className="px-3 py-1 flex justify-between items-center bg-slate-50 dark:bg-slate-700/20">
          <span className="text-[9px] text-slate-400">Resp.: <span className="font-semibold text-slate-500 dark:text-slate-300">Mirian G. Francolino</span></span>
          <span className="text-[9px] text-slate-400 font-mono">{fecha}</span>
        </div>

      </div>
    </div>
  );
}
