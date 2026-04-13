'use client';

import { TurnosTableProps } from '../types';

function NumeroInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value || ''}
      onChange={e => {
        const num = parseInt(e.target.value.replace(/\D/g, '')) || 0;
        onChange(num);
      }}
      onFocus={e => e.currentTarget.select()}
      className="w-full px-2 py-1 rounded text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono"
    />
  );
}

// Abreviaciones para tratamiento en display compacto
const TRAT_ABREV: Record<string, string> = {
  'Depilación PROMO 1': 'Dep P1',
  'Depilación PROMO 2': 'Dep P2',
  'Depilación PROMO 3': 'Dep P3',
  'Depilación PROMO 4': 'Dep P4',
  'Uñas': 'Uñas',
  'Estética': 'Estét',
  'Pestañas': 'Pest',
  'Otro': 'Otro',
};

export default function TurnosTable({
  turnos,
  onActualizar,
  onEliminar,
  onAgregar,
}: TurnosTableProps) {
  if (turnos.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm space-y-2">
        <p>Sin turnos cargados para hoy</p>
        <button onClick={onAgregar} className="text-blue-600 font-bold hover:underline">
          + Agregar primer turno
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Cada turno = una fila tipo card bien aireada */}
      <div className="space-y-1">
        {/* Header columnas */}
        <div className="grid grid-cols-[72px_1fr_170px_60px_76px_76px_42px_60px_30px] gap-x-2 px-3 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          <span>Hora</span>
          <span>Clienta</span>
          <span>Promo / Detalle</span>
          <span className="text-center">Asist.</span>
          <span className="text-right">Total</span>
          <span className="text-right">Seña</span>
          <span className="text-center">Est.</span>
          <span className="text-center">Pago</span>
          <span></span>
        </div>

        {turnos.map((turno, idx) => (
          <div
            key={turno.id}
            className={`grid grid-cols-[72px_1fr_170px_60px_76px_76px_42px_60px_30px] gap-x-2 items-center px-3 py-2 rounded-lg border ${
              idx % 2 === 0
                ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                : 'bg-slate-50 dark:bg-slate-700/40 border-slate-100 dark:border-slate-600'
            } hover:border-blue-300 dark:hover:border-blue-600 transition-colors`}
          >
            {/* Hora */}
            <div>
              <input
                type="time"
                value={turno.horario}
                onChange={e => onActualizar(turno.id, { horario: e.target.value })}
                className="w-full px-1 py-1 rounded text-sm font-mono border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
              />
            </div>

            {/* Clienta — nombre completo */}
            <div>
              <input
                type="text"
                value={turno.clienteNombre}
                onChange={e => onActualizar(turno.id, { clienteNombre: e.target.value })}
                placeholder="Nombre y apellido"
                className="w-full px-2 py-1 rounded text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-medium"
              />
            </div>

            {/* Tratamiento + Detalle */}
            <div className="flex flex-col gap-1">
              <select
                value={turno.tratamiento}
                onChange={e => onActualizar(turno.id, { tratamiento: e.target.value as any })}
                className="w-full px-1 py-1 rounded text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-semibold"
              >
                <option>Depilación PROMO 1</option>
                <option>Depilación PROMO 2</option>
                <option>Depilación PROMO 3</option>
                <option>Depilación PROMO 4</option>
                <option>Promo Combo 1</option>
                <option>Promo Combo 2</option>
                <option>Uñas</option>
                <option>Estética</option>
                <option>Pestañas</option>
                <option>Otro</option>
              </select>
              {/* Detalle del tratamiento — qué se hace exactamente */}
              <input
                type="text"
                value={turno.detalle || ''}
                onChange={e => onActualizar(turno.id, { detalle: e.target.value })}
                placeholder="Ej: Cuerpo completo, Esculpidas..."
                className="w-full px-1 py-0.5 rounded text-xs border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 italic"
              />
            </div>

            {/* Asistencia */}
            <div className="flex gap-1 justify-center">
              <button
                onClick={() => onActualizar(turno.id, { asistencia: 'presente' })}
                title="Presente"
                className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                  turno.asistencia === 'presente'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 hover:bg-green-100'
                }`}
              >
                P
              </button>
              <button
                onClick={() => onActualizar(turno.id, { asistencia: 'no_vino' })}
                title="No vino"
                className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                  turno.asistencia === 'no_vino'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 hover:bg-red-100'
                }`}
              >
                NV
              </button>
            </div>

            {/* Total */}
            <div>
              <NumeroInput
                value={turno.monto_total}
                onChange={v => onActualizar(turno.id, { monto_total: v })}
              />
            </div>

            {/* Seña */}
            <div>
              <NumeroInput
                value={turno.seña_pagada}
                onChange={v => onActualizar(turno.id, { seña_pagada: v })}
              />
            </div>

            {/* Estado automático */}
            <div className="flex justify-center">
              <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                turno.estado_pago === 'completo'
                  ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                  : turno.estado_pago === 'seña'
                    ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
              }`}>
                {turno.estado_pago === 'completo' ? '✓' : turno.estado_pago === 'seña' ? '⏳' : '○'}
              </span>
            </div>

            {/* Método de pago */}
            <div>
              <select
                value={turno.metodo_pago}
                onChange={e => onActualizar(turno.id, { metodo_pago: e.target.value as any })}
                className="w-full px-1 py-1 rounded text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
              >
                <option value="efectivo">Efect</option>
                <option value="transferencia">Transf</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            {/* Eliminar */}
            <div className="flex justify-center">
              <button
                onClick={() => onEliminar(turno.id)}
                title="Eliminar turno"
                className="w-6 h-6 flex items-center justify-center rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Botón agregar */}
      <button
        onClick={onAgregar}
        className="w-full px-3 py-2.5 rounded-lg bg-blue-600 dark:bg-blue-700 text-white font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
      >
        ➕ Agregar Turno
      </button>
    </div>
  );
}
