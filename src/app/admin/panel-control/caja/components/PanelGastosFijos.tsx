'use client';

import { useState, useRef, useEffect } from 'react';
import type { GastoFijo, TipoGastoFijo, PagoMes } from '../hooks/useGastosFijos';

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}

function parseMonto(s: string): number {
  return parseInt(s.replace(/\D/g, ''), 10) || 0;
}

function formatInput(s: string): string {
  const n = s.replace(/\D/g, '');
  if (!n) return '';
  return parseInt(n, 10).toLocaleString('es-AR');
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  empresa: GastoFijo[];
  personal: GastoFijo[];
  mes: string;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mesAnterior: string;  // recibido para consistencia aunque no se usa directamente
  nombreMesAnterior: string;
  nombreMesActual: string;
  deudaMesAnterior: number;
  guardando: boolean;
  syncStatus: 'idle' | 'guardando' | 'guardado' | 'error';
  getPagoMes: (g: GastoFijo) => PagoMes;
  onPagar: (id: string, monto: number, tipo: TipoGastoFijo) => void;
  onReset: (id: string, tipo: TipoGastoFijo) => void;
  onEliminar: (id: string, tipo: TipoGastoFijo) => void;
  onActualizarMonto: (id: string, monto: number, tipo: TipoGastoFijo) => void;
  onActualizarNombre: (id: string, nombre: string, tipo: TipoGastoFijo) => void;
  onAgregarEmpresa: (nombre: string, monto: number) => void;
  onAgregarPersonal: (nombre: string, monto: number) => void;
  onGuardar: () => void;
  totalPendienteEmpresa: number;
  totalPendientePersonal: number;
}

// ─── Row de un gasto fijo ─────────────────────────────────────────────────────

function GastoFijoRow({
  gasto,
  pagoMes,
  onPagar,
  onReset,
  onEliminar,
  onActualizarMonto,
  onActualizarNombre,
}: {
  gasto: GastoFijo;
  pagoMes: PagoMes;
  onPagar: (monto: number) => void;
  onReset: () => void;
  onEliminar: () => void;
  onActualizarMonto: (monto: number) => void;
  onActualizarNombre: (nombre: string) => void;
}) {
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombreEdit, setNombreEdit] = useState(gasto.nombre);
  const [editandoMonto, setEditandoMonto] = useState(false);
  const [montoEdit, setMontoEdit] = useState('');
  const [pagando, setPagando] = useState(false);
  const [montoPago, setMontoPago] = useState('');
  const inputNombreRef = useRef<HTMLInputElement>(null);
  const inputMontoRef = useRef<HTMLInputElement>(null);
  const inputPagoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editandoNombre) inputNombreRef.current?.focus(); }, [editandoNombre]);
  useEffect(() => { if (editandoMonto)  inputMontoRef.current?.focus();  }, [editandoMonto]);
  useEffect(() => { if (pagando)        inputPagoRef.current?.focus();   }, [pagando]);

  const { montoAcumulado, pagado, fechaPago } = pagoMes;
  const porcentaje = gasto.montoTotal > 0
    ? Math.min(100, Math.round((montoAcumulado / gasto.montoTotal) * 100))
    : 0;
  const pendiente = Math.max(0, gasto.montoTotal - montoAcumulado);

  const confirmarNombre = () => {
    if (nombreEdit.trim()) onActualizarNombre(nombreEdit.trim());
    setEditandoNombre(false);
  };

  const confirmarMonto = () => {
    const m = parseMonto(montoEdit);
    if (m >= 0) onActualizarMonto(m);
    setEditandoMonto(false);
  };

  const confirmarPago = () => {
    const m = parseMonto(montoPago);
    if (m > 0) onPagar(m);
    setMontoPago('');
    setPagando(false);
  };

  return (
    <div className={`rounded-lg px-2 py-1.5 border text-xs ${
      pagado
        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
    }`}>

      {/* Línea 1: nombre + monto total + botones */}
      <div className="flex items-center gap-1 min-w-0">

        {/* Nombre editable */}
        {editandoNombre ? (
          <input
            ref={inputNombreRef}
            value={nombreEdit}
            onChange={e => setNombreEdit(e.target.value)}
            onBlur={confirmarNombre}
            onKeyDown={e => { if (e.key === 'Enter') confirmarNombre(); if (e.key === 'Escape') setEditandoNombre(false); }}
            className="flex-1 min-w-0 px-1 py-0 rounded border border-violet-400 bg-white dark:bg-slate-700 text-xs font-medium outline-none"
          />
        ) : (
          <button
            onClick={() => { setNombreEdit(gasto.nombre); setEditandoNombre(true); }}
            className="flex-1 min-w-0 text-left font-semibold text-slate-700 dark:text-slate-200 truncate hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            title="Click para editar nombre"
          >
            {gasto.nombre}
          </button>
        )}

        {/* Monto total editable */}
        {editandoMonto ? (
          <div className="flex items-center gap-0.5 shrink-0">
            <span className="text-[10px] text-slate-400">$</span>
            <input
              ref={inputMontoRef}
              value={montoEdit}
              onChange={e => setMontoEdit(formatInput(e.target.value))}
              onBlur={confirmarMonto}
              onKeyDown={e => { if (e.key === 'Enter') confirmarMonto(); if (e.key === 'Escape') setEditandoMonto(false); }}
              className="w-20 px-1 py-0 rounded border border-violet-400 bg-white dark:bg-slate-700 text-xs font-mono text-right outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => { setMontoEdit(gasto.montoTotal > 0 ? gasto.montoTotal.toString() : ''); setEditandoMonto(true); }}
            className="shrink-0 font-mono text-[10px] text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            title="Click para editar monto total"
          >
            {gasto.montoTotal > 0 ? fmt(gasto.montoTotal) : 'sin monto'}
          </button>
        )}

        {/* Botones acción */}
        <div className="flex gap-0.5 shrink-0">
          {!pagado && (
            <>
              {/* Pago parcial — abre input */}
              <button
                onClick={() => setPagando(p => !p)}
                className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors"
                title="Registrar pago parcial"
              >
                + Pagar
              </button>
              {/* Pago total — un toque, sin input */}
              {gasto.montoTotal > 0 && pendiente > 0 && (
                <button
                  onClick={() => onPagar(pendiente)}
                  className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors"
                  title={`Marcar como pagado completo (${fmt(pendiente)})`}
                >
                  ✓ Total
                </button>
              )}
            </>
          )}
          <button
            onClick={onReset}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            title="Reiniciar pago de este mes"
          >
            ↺
          </button>
          <button
            onClick={onEliminar}
            className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-[10px] font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            title="Eliminar gasto fijo"
          >
            ×
          </button>
        </div>
      </div>

      {/* Línea 2: barra de progreso + estado */}
      {gasto.montoTotal > 0 && (
        <div className="mt-1 space-y-0.5">
          <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${pagado ? 'bg-green-500' : 'bg-amber-500'}`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            {pagado ? (
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">✓ PAGADO este mes</span>
            ) : (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {fmt(montoAcumulado)} pagado / {fmt(gasto.montoTotal)} total
              </span>
            )}
            {!pagado && pendiente > 0 && (
              <span className="text-[10px] text-red-500 dark:text-red-400 font-mono font-bold">
                -{fmt(pendiente)} pendiente
              </span>
            )}
          </div>
        </div>
      )}

      {/* Badge pagado */}
      {pagado && (
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-semibold">
            ✓ Pagado este mes
          </span>
          {fechaPago && (
            <span className="text-[9px] text-slate-400">{fechaPago}</span>
          )}
        </div>
      )}

      {/* Input de pago inline */}
      {pagando && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="text-[10px] text-slate-400 shrink-0">$ Pagar:</span>
          <input
            ref={inputPagoRef}
            type="text"
            inputMode="numeric"
            value={montoPago}
            onChange={e => setMontoPago(formatInput(e.target.value))}
            onKeyDown={e => { if (e.key === 'Enter') confirmarPago(); if (e.key === 'Escape') { setMontoPago(''); setPagando(false); } }}
            placeholder={gasto.montoTotal > 0 ? fmt(pendiente) : '0'}
            className="flex-1 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-700 text-xs font-mono text-right outline-none focus:border-amber-500"
          />
          <button
            onClick={confirmarPago}
            disabled={!montoPago}
            className="px-2 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold hover:bg-amber-600 disabled:opacity-40 transition-colors shrink-0"
          >
            ✓
          </button>
          <button
            onClick={() => { setMontoPago(''); setPagando(false); }}
            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 text-[10px] font-bold hover:bg-slate-200 transition-colors shrink-0"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Mini form para agregar gasto ─────────────────────────────────────────────

function AgregarGastoForm({
  onAgregar,
  label,
}: {
  onAgregar: (nombre: string, monto: number) => void;
  label: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (abierto) inputRef.current?.focus(); }, [abierto]);

  const confirmar = () => {
    if (!nombre.trim()) return;
    onAgregar(nombre.trim(), parseMonto(monto));
    setNombre(''); setMonto(''); setAbierto(false);
  };

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="w-full mt-1.5 px-2 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:border-slate-400 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
      >
        ＋ {label}
      </button>
    );
  }

  return (
    <div className="mt-1.5 flex flex-col gap-1 p-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/10">
      <input
        ref={inputRef}
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') setAbierto(false); }}
        placeholder="Nombre del gasto (ej: Alquiler)"
        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs outline-none focus:border-violet-400"
      />
      <div className="flex gap-1 items-center">
        <span className="text-[10px] text-slate-400">$</span>
        <input
          type="text"
          inputMode="numeric"
          value={monto}
          onChange={e => setMonto(formatInput(e.target.value))}
          onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') setAbierto(false); }}
          placeholder="0 (opcional, cargarlo después)"
          className="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-mono text-right outline-none focus:border-violet-400"
        />
        <button onClick={confirmar} disabled={!nombre.trim()}
          className="px-2 py-0.5 rounded bg-violet-600 text-white text-[10px] font-bold hover:bg-violet-700 disabled:opacity-40 transition-colors shrink-0">
          Agregar
        </button>
        <button onClick={() => setAbierto(false)}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 text-[10px] font-bold hover:bg-slate-200 transition-colors shrink-0">
          ×
        </button>
      </div>
    </div>
  );
}

// ─── Card por tipo (empresa / personal) ──────────────────────────────────────

function GastosCard({
  titulo,
  emoji,
  subtitulo,
  gastos,
  totalPendiente,
  borderClass,
  headerClass,
  getPagoMes,
  onPagar,
  onReset,
  onEliminar,
  onActualizarMonto,
  onActualizarNombre,
  onAgregar,
  labelAgregar,
}: {
  titulo: string;
  emoji: string;
  subtitulo?: string;
  gastos: GastoFijo[];
  totalPendiente: number;
  borderClass: string;
  headerClass: string;
  getPagoMes: (g: GastoFijo) => PagoMes;
  onPagar: (id: string, monto: number) => void;
  onReset: (id: string) => void;
  onEliminar: (id: string) => void;
  onActualizarMonto: (id: string, monto: number) => void;
  onActualizarNombre: (id: string, nombre: string) => void;
  onAgregar: (nombre: string, monto: number) => void;
  labelAgregar: string;
}) {
  return (
    <div className={`rounded-2xl border-2 ${borderClass} bg-white dark:bg-slate-800 overflow-hidden`}>
      {/* Header */}
      <div className={`px-3 py-2 ${headerClass}`}>
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-100 leading-tight">
              {emoji} {titulo}
            </h3>
            {subtitulo && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{subtitulo}</p>
            )}
          </div>
          {totalPendiente > 0 ? (
            <span className="shrink-0 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full font-mono">
              -{fmt(totalPendiente)} pendiente
            </span>
          ) : gastos.length > 0 ? (
            <span className="shrink-0 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">
              Todo al día ✓
            </span>
          ) : null}
        </div>
      </div>

      {/* Lista */}
      <div className="px-2 py-1.5 space-y-1">
        {gastos.length === 0 ? (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center py-2 italic">
            Sin gastos cargados
          </p>
        ) : (
          gastos.map(g => (
            <GastoFijoRow
              key={g.id}
              gasto={g}
              pagoMes={getPagoMes(g)}
              onPagar={m => onPagar(g.id, m)}
              onReset={() => onReset(g.id)}
              onEliminar={() => onEliminar(g.id)}
              onActualizarMonto={m => onActualizarMonto(g.id, m)}
              onActualizarNombre={n => onActualizarNombre(g.id, n)}
            />
          ))
        )}

        <AgregarGastoForm onAgregar={onAgregar} label={labelAgregar} />
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────

export default function PanelGastosFijos({
  empresa,
  personal,
  mes,
  nombreMesAnterior,
  nombreMesActual,
  deudaMesAnterior,
  guardando,
  syncStatus,
  getPagoMes,
  onPagar,
  onReset,
  onEliminar,
  onActualizarMonto,
  onActualizarNombre,
  onAgregarEmpresa,
  onAgregarPersonal,
  onGuardar,
  totalPendienteEmpresa,
  totalPendientePersonal,
}: Props) {

  // Suprimir advertencia del lint — mes se usa para el label del mes actual
  void mes;

  return (
    <section>
      {/* Header con botón Guardar */}
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="min-w-0">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            🗂️ Gastos Fijos — {nombreMesActual}
          </h2>
          {(totalPendienteEmpresa + totalPendientePersonal) > 0 && (
            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 font-mono">
              Total pendiente este mes: -{fmt(totalPendienteEmpresa + totalPendientePersonal)}
            </p>
          )}
        </div>

        {/* Botón Guardar */}
        <button
          onClick={onGuardar}
          disabled={guardando}
          className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
            syncStatus === 'guardado'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
              : syncStatus === 'error'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300'
              : syncStatus === 'guardando'
              ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 animate-pulse'
              : 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700 hover:bg-violet-200 dark:hover:bg-violet-900/50'
          }`}
        >
          {syncStatus === 'guardando' ? '⏳' :
           syncStatus === 'guardado'  ? '✓' :
           syncStatus === 'error'     ? '⚠' :
           '💾'}
          {' '}
          {syncStatus === 'guardando' ? 'Guardando...' :
           syncStatus === 'guardado'  ? 'Guardado' :
           syncStatus === 'error'     ? 'Sin conexión' :
           'Guardar'}
        </button>
      </div>

      {/* ── Recordatorio: quedan gastos sin marcar del mes anterior ── */}
      {deudaMesAnterior > 0 && (
        <div className="mb-2 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 flex items-center gap-2">
          <span className="text-base shrink-0">🔔</span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
              Recordatorio — {nombreMesAnterior}: {fmt(deudaMesAnterior)} sin marcar como pagado
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-500">
              Si ya lo pagaste, marcálo arriba para tener el registro al día.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Empresa — rojo */}
        <GastosCard
          titulo="Gastos Empresa"
          emoji="💼"
          gastos={empresa}
          totalPendiente={totalPendienteEmpresa}
          borderClass="border-red-300 dark:border-red-700"
          headerClass="bg-red-50 dark:bg-red-900/10 border-b border-red-100 dark:border-red-900/30"
          getPagoMes={getPagoMes}
          onPagar={(id, m) => onPagar(id, m, 'empresa')}
          onReset={id => onReset(id, 'empresa')}
          onEliminar={id => onEliminar(id, 'empresa')}
          onActualizarMonto={(id, m) => onActualizarMonto(id, m, 'empresa')}
          onActualizarNombre={(id, n) => onActualizarNombre(id, n, 'empresa')}
          onAgregar={onAgregarEmpresa}
          labelAgregar="Agregar gasto empresa"
        />

        {/* Personal — azul */}
        <GastosCard
          titulo="Gastos Personales"
          emoji="🏠"
          subtitulo="Mirian G. Francolino"
          gastos={personal}
          totalPendiente={totalPendientePersonal}
          borderClass="border-blue-300 dark:border-blue-700"
          headerClass="bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30"
          getPagoMes={getPagoMes}
          onPagar={(id, m) => onPagar(id, m, 'personal')}
          onReset={id => onReset(id, 'personal')}
          onEliminar={id => onEliminar(id, 'personal')}
          onActualizarMonto={(id, m) => onActualizarMonto(id, m, 'personal')}
          onActualizarNombre={(id, n) => onActualizarNombre(id, n, 'personal')}
          onAgregar={onAgregarPersonal}
          labelAgregar="Agregar gasto personal"
        />
      </div>
    </section>
  );
}
