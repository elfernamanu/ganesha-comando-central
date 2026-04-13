'use client';

import { Turno, TurnosTableProps } from '../types';

// Formatter sin decimales ($ 120.000)
function formatDinero(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(n);
}

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
      className="w-16 px-1 py-0.5 rounded text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
    />
  );
}

export default function TurnosTable({
  turnos,
  onActualizar,
  onEliminar,
  onAgregar,
}: TurnosTableProps) {
  if (turnos.length === 0) {
    return (
      <div className="text-center py-4 text-slate-400 text-sm">
        Sin turnos. <button onClick={onAgregar} className="text-blue-600">+ Agregar</button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Tabla compacta */}
      <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
              <th className="px-2 py-1 text-left font-bold">Hora</th>
              <th className="px-2 py-1 text-left font-bold">Clienta</th>
              <th className="px-2 py-1 text-left font-bold">Tratamiento</th>
              <th className="px-2 py-1 text-center font-bold">Asistencia</th>
              <th className="px-2 py-1 text-right font-bold">Total</th>
              <th className="px-2 py-1 text-right font-bold">Seña</th>
              <th className="px-2 py-1 text-center font-bold">Estado</th>
              <th className="px-2 py-1 text-center font-bold">Pago</th>
              <th className="px-2 py-1 text-center font-bold">Acc.</th>
            </tr>
          </thead>
          <tbody>
            {turnos.map((turno, idx) => (
              <tr
                key={turno.id}
                className={`border-b border-slate-200 dark:border-slate-700 ${
                  idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-700/30'
                } hover:bg-blue-50 dark:hover:bg-slate-700`}
              >
                {/* Horario */}
                <td className="px-2 py-1">
                  <input
                    type="time"
                    value={turno.horario}
                    onChange={e => onActualizar(turno.id, { horario: e.target.value })}
                    className="w-16 px-1 py-0.5 rounded text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  />
                </td>

                {/* Clienta */}
                <td className="px-2 py-1">
                  <input
                    type="text"
                    value={turno.clienteNombre}
                    onChange={e => onActualizar(turno.id, { clienteNombre: e.target.value })}
                    placeholder="Nombre"
                    className="w-20 px-1 py-0.5 rounded text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  />
                </td>

                {/* Tratamiento */}
                <td className="px-2 py-1">
                  <select
                    value={turno.tratamiento}
                    onChange={e => onActualizar(turno.id, { tratamiento: e.target.value as any })}
                    className="w-24 px-1 py-0.5 rounded text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  >
                    <option>Depilación PROMO 1</option>
                    <option>Depilación PROMO 2</option>
                    <option>Depilación PROMO 3</option>
                    <option>Depilación PROMO 4</option>
                    <option>Uñas</option>
                    <option>Estética</option>
                    <option>Pestañas</option>
                    <option>Otro</option>
                  </select>
                </td>

                {/* Asistencia */}
                <td className="px-2 py-1 text-center">
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => onActualizar(turno.id, { asistencia: 'presente' })}
                      className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                        turno.asistencia === 'presente'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      P
                    </button>
                    <button
                      onClick={() => onActualizar(turno.id, { asistencia: 'no_vino' })}
                      className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                        turno.asistencia === 'no_vino'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      NV
                    </button>
                  </div>
                </td>

                {/* Total */}
                <td className="px-2 py-1 text-right font-mono text-xs">
                  <NumeroInput
                    value={turno.monto_total}
                    onChange={v => onActualizar(turno.id, { monto_total: v })}
                  />
                </td>

                {/* Seña */}
                <td className="px-2 py-1 text-right font-mono text-xs">
                  <NumeroInput
                    value={turno.seña_pagada}
                    onChange={v => onActualizar(turno.id, { seña_pagada: v })}
                  />
                </td>

                {/* Estado */}
                <td className="px-2 py-1 text-center">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    turno.estado_pago === 'completo'
                      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      : turno.estado_pago === 'seña'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {turno.estado_pago === 'completo' ? '✓' : turno.estado_pago === 'seña' ? '⏳' : '○'}
                  </span>
                </td>

                {/* Método */}
                <td className="px-2 py-1 text-center">
                  <select
                    value={turno.metodo_pago}
                    onChange={e => onActualizar(turno.id, { metodo_pago: e.target.value as any })}
                    className="w-16 px-1 py-0.5 rounded text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  >
                    <option value="efectivo">Efect</option>
                    <option value="transferencia">Transf</option>
                    <option value="otro">Otro</option>
                  </select>
                </td>

                {/* Acciones */}
                <td className="px-2 py-1 text-center">
                  <button
                    onClick={() => onEliminar(turno.id)}
                    className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 px-1 py-0.5 rounded text-xs"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botón agregar */}
      <button
        onClick={onAgregar}
        className="w-full px-3 py-2 rounded-lg bg-blue-600 dark:bg-blue-700 text-white font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
      >
        ➕ Agregar Turno
      </button>
    </div>
  );
}
