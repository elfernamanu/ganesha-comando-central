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
  // Compatibilidad: soporta tanto el campo raíz legacy (montoAcumulado/pagado)
  // como el nuevo formato con pagos por mes (cuando se pasan objetos enriquecidos)
  const gEmpresa  = gastosFijosEmpresa.map(g => ({ ...g, montoAcumulado: g.montoAcumulado ?? 0, pagado: g.pagado ?? false }));
  const gPersonal = gastosFijosPersonal.map(g => ({ ...g, montoAcumulado: g.montoAcumulado ?? 0, pagado: g.pagado ?? false }));

  const empPendiente = gEmpresa.filter(g => !g.pagado && g.activo);
  const perPendiente = gPersonal.filter(g => !g.pagado && g.activo);

  // Fijos pagados (se descuentan de la ganancia como gasto real)
  const totalFijosEmpresaPagado  = gEmpresa.filter(g => g.activo).reduce((s, g) => s + g.montoAcumulado, 0);
  const totalFijosPersonalPagado = gPersonal.filter(g => g.activo).reduce((s, g) => s + g.montoAcumulado, 0);
  const totalFijosPagados        = totalFijosEmpresaPagado + totalFijosPersonalPagado;

  // Fijos aún no pagados este mes (deuda futura)
  const totalFijosPendiente =
    empPendiente.reduce((s, g) => s + Math.max(0, g.montoTotal - g.montoAcumulado), 0) +
    perPendiente.reduce((s, g) => s + Math.max(0, g.montoTotal - g.montoAcumulado), 0);

  // gananciaFinal = lo que queda después de gastos del día + fijos ya pagados
  const gananciaFinal = totales.ingresos_totales - totales.gastos_totales - totalFijosPagados;
  // gananciaReal = si encima se pagan todos los pendientes
  const gananciaReal  = gananciaFinal - totalFijosPendiente;

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
            estadoCaja === 'cerrada'
              ? 'bg-red-500 text-white'
              : 'bg-white/20 text-white'
          }`}>
            {estadoCaja === 'cerrada' ? 'CERRADA' : 'ABIERTA'}
          </span>
        </div>
      </div>

      <div className="p-2 space-y-2">

        {/* ── Bloque 1: Cuenta clara — cobrado → gastos → ganancia ── */}
        <div className="rounded-xl border-2 border-slate-200 dark:border-slate-600 overflow-hidden">
          {/* Cobrado */}
          <div className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
            <div>
              <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">💰 Lo que cobró hoy</p>
              <p className="text-[9px] text-green-600 dark:text-green-500">
                {cobradosCount} cliente{cobradosCount !== 1 ? 's' : ''} pagaron
                {totales.efectivo > 0 && ` · Ef. ${fmt(totales.efectivo)}`}
                {totales.transferencia > 0 && ` · Tr. ${fmt(totales.transferencia)}`}
              </p>
            </div>
            <p className="text-xl font-black text-green-700 dark:text-green-300 font-mono">{fmt(totales.ingresos_totales)}</p>
          </div>

          {/* Gastos del día */}
          {totales.gastos_totales > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                💸 Gastos del día <span className="text-slate-400">({gastos.length} concepto{gastos.length !== 1 ? 's' : ''})</span>
              </p>
              <p className="text-sm font-bold font-mono text-red-600 dark:text-red-400">− {fmt(totales.gastos_totales)}</p>
            </div>
          )}

          {/* Gastos fijos pagados */}
          {totalFijosPagados > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-slate-700">
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                📋 Fijos del mes pagados <span className="text-slate-400">(alquiler, servicios...)</span>
              </p>
              <p className="text-sm font-bold font-mono text-red-600 dark:text-red-400">− {fmt(totalFijosPagados)}</p>
            </div>
          )}

          {/* Fijos pendientes — informativo, no se descuenta de gananciaFinal */}
          {totalFijosPendiente > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                ⚠️ Fijos aún no pagados este mes
              </p>
              <p className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">− {fmt(totalFijosPendiente)}</p>
            </div>
          )}

          {/* Resultado final */}
          <div className={`flex items-center justify-between px-3 py-2.5 ${
            gananciaFinal >= 0 ? 'bg-emerald-600 dark:bg-emerald-700' : 'bg-red-600 dark:bg-red-700'
          }`}>
            <p className="text-sm font-black text-white uppercase tracking-wide">
              {gananciaFinal >= 0 ? '✅ Ganancia neta' : '⚠️ Resultado'}
            </p>
            <p className="text-2xl font-black text-white font-mono">{fmt(gananciaFinal)}</p>
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
                <div key={t.id} className={`flex items-center gap-2 px-3 py-0.5 ${
                  noVino ? 'opacity-50 bg-red-50 dark:bg-red-900/10' : pagado ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                }`}>
                  <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate shrink-0">{t.clienteNombre || '—'}</p>
                    {t.tratamiento && t.tratamiento !== 'sin servicio' && (
                      <p className="text-[11px] text-slate-400 truncate min-w-0">{t.tratamiento}</p>
                    )}
                  </div>
                  {!noVino && (
                    <span className="shrink-0 text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300">
                      {fmt(t.seña_pagada ?? 0)}
                      <span className="text-[9px] font-normal text-slate-400 ml-0.5">
                        {t.metodo_pago === 'efectivo' ? 'Ef.' : t.metodo_pago === 'transferencia' ? 'Tr.' : 'Ot.'}
                      </span>
                    </span>
                  )}
                  <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    noVino  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    pagado  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    (t.seña_pagada ?? 0) > 0 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-slate-100 text-slate-400 dark:bg-slate-700'
                  }`}>
                    {noVino ? 'No vino' : pagado ? 'Completo' : (t.seña_pagada ?? 0) > 0 ? 'Seña' : 'Sin pago'}
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
                {gEmpresa.filter(g => g.activo).length === 0 && (
                  <p className="text-[10px] text-slate-400 italic text-center py-1.5">Sin gastos</p>
                )}
                {gEmpresa.filter(g => g.activo).map(g => (
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
                {gPersonal.filter(g => g.activo).length === 0 && (
                  <p className="text-[10px] text-slate-400 italic text-center py-1.5">Sin gastos</p>
                )}
                {gPersonal.filter(g => g.activo).map(g => (
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
