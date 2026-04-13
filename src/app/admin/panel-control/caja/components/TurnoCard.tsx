'use client';

import { Turno, TurnoCardProps } from '../types/index';
import { formatearDinero, formatearNombre, formatearHora } from '../utils/formatters';
import { ESTADOS_TURNO, METODOS_PAGO } from '../constants/index';

export default function TurnoCard({ turno, onActualizar, onEliminar }: TurnoCardProps) {
  const estadoConfig = ESTADOS_TURNO.find(e => e.value === turno.estado);
  const metodoConfig = METODOS_PAGO.find(m => m.value === turno.metodo_pago);

  const handleEstado = (nuevoEstado: typeof turno.estado) => {
    let nuevoMontoPagado = turno.monto_pagado;

    // Si cambia a "pagado_completo", actualizar monto_pagado
    if (nuevoEstado === 'pagado_completo' && turno.estado !== 'pagado_completo') {
      nuevoMontoPagado = turno.monto_total;
    }
    // Si cambia a "ausente", no cobrar nada
    else if (nuevoEstado === 'ausente') {
      nuevoMontoPagado = 0;
    }

    onActualizar(turno.id, {
      estado: nuevoEstado,
      monto_pagado: nuevoMontoPagado,
    });
  };

  return (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{formatearNombre(turno.clienteNombre)}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatearHora(turno.horario)} • {turno.servicios.join(' + ')}
          </p>
        </div>
        <div className="flex gap-1">
          {onEliminar && (
            <button
              onClick={() => onEliminar(turno.id)}
              className="px-2 py-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 text-sm"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Montos */}
      <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/30">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Monto Total</p>
          <p className="font-bold text-sm">{formatearDinero(turno.monto_total)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Seña Req.</p>
          <p className="font-bold text-sm">{formatearDinero(turno.senia_requerida)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Cobrado</p>
          <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
            {formatearDinero(turno.monto_pagado)}
          </p>
        </div>
      </div>

      {/* Seña pagada */}
      {turno.estado !== 'ausente' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 dark:text-slate-400">Seña pagada:</label>
          <input
            type="number"
            value={turno.senia_pagada || 0}
            onChange={e => {
              const valor = Math.max(0, parseInt(e.target.value) || 0);
              onActualizar(turno.id, { senia_pagada: valor });
            }}
            onFocus={e => e.target.select()}
            className="w-20 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm font-medium"
            placeholder="0"
          />
        </div>
      )}

      {/* Botones de estado */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {ESTADOS_TURNO.map(estado => (
          <button
            key={estado.value}
            onClick={() => handleEstado(estado.value)}
            className={`px-2 py-2 rounded-lg text-xs font-bold transition-colors ${
              turno.estado === estado.value
                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {estado.icon} {estado.label}
          </button>
        ))}
      </div>

      {/* Método de pago */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-500 dark:text-slate-400">Método:</label>
        <select
          value={turno.metodo_pago}
          onChange={e => onActualizar(turno.id, { metodo_pago: e.target.value as any })}
          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
        >
          {METODOS_PAGO.map(metodo => (
            <option key={metodo.value} value={metodo.value}>
              {metodo.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notas */}
      <input
        type="text"
        value={turno.notas || ''}
        onChange={e => onActualizar(turno.id, { notas: e.target.value })}
        placeholder="Notas (opcional)"
        className="w-full px-3 py-2 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
      />
    </div>
  );
}
