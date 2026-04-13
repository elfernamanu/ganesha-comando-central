'use client';

import { useState, useEffect } from 'react';
import { TurnosTableProps } from '../types';
import { leerCatalogo, buscarEnCatalogo, type CatalogoPromos } from '../../_shared/catalogoPromos';

// ── Formatea número con puntos de miles (es-AR: 20000 → "20.000") ──────
function formatPuntos(n: number): string {
  if (!n) return '';
  return n.toLocaleString('es-AR');
}

// ── Input numérico con puntos de miles, sin flechas ────────────────────
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
      value={formatPuntos(value)}
      onChange={e => {
        const num = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
        onChange(num);
      }}
      onFocus={e => e.currentTarget.select()}
      className="w-full px-2 py-1 rounded text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono"
    />
  );
}

// ── Orden fijo de grupos en el dropdown ───────────────────────────────
const GRUPOS_ORDEN = [
  { prefix: 'Depilación PROMO', label: '✨ Depilación' },
  { prefix: 'Promo Combo',      label: '🎁 Combos' },
  { prefix: 'otros',            label: '💅 Servicios' },
];

const SERVICIOS_SIMPLES = ['Uñas', 'Estética', 'Pestañas', 'Otro'];

// ── Componente principal ───────────────────────────────────────────────
export default function TurnosTable({
  turnos,
  onActualizar,
  onEliminar,
  onAgregar,
}: TurnosTableProps) {
  // Catálogo: se lee una vez al montar (después de que la dueña lo configuró)
  const [catalogo, setCatalogo] = useState<CatalogoPromos>({});

  useEffect(() => {
    setCatalogo(leerCatalogo());
  }, []);

  // Opciones del dropdown agrupadas por tipo
  const opcionesDepi  = Object.keys(catalogo).filter(k => k.startsWith('Depilación PROMO'));
  const opcionesCombos = Object.keys(catalogo).filter(k => k.startsWith('Promo Combo'));

  // Cuando la secretaria cambia el tratamiento → auto-completar detalle + monto
  const handleTratamientoChange = (turnoId: string, nuevoTrat: string) => {
    const item = catalogo[nuevoTrat] ?? buscarEnCatalogo(nuevoTrat);
    const cambios: Record<string, unknown> = { tratamiento: nuevoTrat };

    if (item) {
      if (item.detalle) cambios.detalle = item.detalle;
      if (item.precio > 0) cambios.monto_total = item.precio;
    }

    onActualizar(turnoId, cambios as any);
  };

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
      {/* overflow-x-auto → scroll horizontal en mobile sin romper layout */}
      <div className="overflow-x-auto rounded-lg">
      <div className="min-w-[640px] space-y-1">
        {/* ── Header ── */}
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

            {/* Clienta */}
            <div>
              <input
                type="text"
                value={turno.clienteNombre}
                onChange={e => onActualizar(turno.id, { clienteNombre: e.target.value })}
                placeholder="Nombre y apellido"
                className="w-full px-2 py-1 rounded text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-medium"
              />
            </div>

            {/* Tratamiento + Detalle — auto-completa desde catálogo */}
            <div className="flex flex-col gap-1">
              <select
                value={turno.tratamiento}
                onChange={e => handleTratamientoChange(turno.id, e.target.value)}
                className="w-full px-1 py-1 rounded text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-semibold"
              >
                {/* Grupo Depilación */}
                {opcionesDepi.length > 0 && (
                  <optgroup label="✨ Depilación">
                    {opcionesDepi.sort().map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </optgroup>
                )}

                {/* Grupo Combos */}
                {opcionesCombos.length > 0 && (
                  <optgroup label="🎁 Combos">
                    {opcionesCombos.sort().map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </optgroup>
                )}

                {/* Servicios simples */}
                <optgroup label="💅 Servicios">
                  {SERVICIOS_SIMPLES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
              </select>

              {/* Detalle — auto-cargado desde catálogo, editable */}
              <input
                type="text"
                value={turno.detalle || ''}
                onChange={e => onActualizar(turno.id, { detalle: e.target.value })}
                placeholder="Se carga al elegir la promo..."
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

            {/* Total — se carga automático, editable */}
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

            {/* Estado de pago — click para marcar como COBRADO TOTAL */}
            <div className="flex justify-center">
              {turno.estado_pago === 'completo' ? (
                // Ya cobrado: click para deshacer (vuelve a 0)
                <button
                  onClick={() => onActualizar(turno.id, { seña_pagada: 0 })}
                  title="Cobrado — click para deshacer"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold bg-green-500 text-white shadow-sm hover:bg-green-600 transition-colors"
                >
                  ✓
                </button>
              ) : turno.asistencia === 'presente' && turno.monto_total > 0 ? (
                // Presente con monto: click para cobrar total
                <button
                  onClick={() => onActualizar(turno.id, { seña_pagada: turno.monto_total })}
                  title={`Marcar cobrado: $${turno.monto_total.toLocaleString('es-AR')}`}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold border-2 transition-colors ${
                    turno.estado_pago === 'seña'
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 hover:bg-yellow-400 hover:text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-400 hover:border-green-400 hover:bg-green-50 hover:text-green-600'
                  }`}
                >
                  {turno.estado_pago === 'seña' ? '⏳' : '○'}
                </button>
              ) : (
                // No vino o sin monto: solo visual
                <span className="w-8 h-8 flex items-center justify-center rounded-full text-sm bg-slate-100 dark:bg-slate-700 text-slate-300">
                  ○
                </span>
              )}
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
