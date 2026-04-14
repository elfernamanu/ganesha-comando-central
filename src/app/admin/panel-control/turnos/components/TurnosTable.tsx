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
  error = false,
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  error?: boolean;
  className?: string;
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
      className={`w-full px-2 py-1 rounded text-sm border bg-white dark:bg-slate-700 font-mono ${
        error
          ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
          : 'border-slate-300 dark:border-slate-600'
      } ${className}`}
    />
  );
}

// ── Botones asistencia ────────────────────────────────────────────────
function BotonesAsistencia({
  asistencia,
  onChange,
  size = 'sm',
}: {
  asistencia: string;
  onChange: (v: string) => void;
  size?: 'sm' | 'lg';
}) {
  const base = size === 'lg'
    ? 'flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors'
    : 'w-7 h-7 rounded text-xs font-bold transition-colors';

  return (
    <div className={`flex gap-2 ${size === 'lg' ? 'w-full' : ''}`}>
      <button
        onClick={() => onChange('presente')}
        title="Presente"
        className={`${base} ${
          asistencia === 'presente'
            ? 'bg-green-600 text-white shadow-sm'
            : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 hover:bg-green-100'
        }`}
      >
        {size === 'lg' ? '✅ Presente' : 'P'}
      </button>
      <button
        onClick={() => onChange('no_vino')}
        title="No vino"
        className={`${base} ${
          asistencia === 'no_vino'
            ? 'bg-red-600 text-white shadow-sm'
            : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400 hover:bg-red-100'
        }`}
      >
        {size === 'lg' ? '❌ No vino' : 'NV'}
      </button>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────
export default function TurnosTable({
  turnos,
  onActualizar,
  onEliminar,
  onAgregar,
}: TurnosTableProps) {
  const [catalogo, setCatalogo] = useState<CatalogoPromos>({});

  useEffect(() => {
    const cargar = () => setCatalogo(leerCatalogo());
    cargar();
    window.addEventListener('focus', cargar);
    return () => window.removeEventListener('focus', cargar);
  }, []);

  const opcionesDepi     = Object.values(catalogo).filter(item => item.categoria === 'depilacion');
  const opcionesUnas     = Object.values(catalogo).filter(item => item.categoria === 'unas');
  const opcionesEstetica = Object.values(catalogo).filter(item => item.categoria === 'estetica');
  const opcionesPestanas = Object.values(catalogo).filter(item => item.categoria === 'pestanas');
  const opcionesCombos   = Object.values(catalogo).filter(item => item.categoria === 'combo');

  const handleTratamientoChange = (turnoId: string, nuevoTrat: string) => {
    const item = catalogo[nuevoTrat] ?? buscarEnCatalogo(nuevoTrat);
    const detalle = item?.detalle
      || (item?.categoria === 'combo' ? item?.nombreDisplay : '')
      || '';
    const cambios: Record<string, unknown> = {
      tratamiento: nuevoTrat,
      detalle,
      monto_total: item?.precio ?? 0,
    };
    onActualizar(turnoId, cambios as any);
  };

  // ── Dropdown servicios reutilizable ───────────────────────────────
  function SelectServicio({
    turnoId,
    tratamiento,
    className = '',
  }: {
    turnoId: string;
    tratamiento: string;
    className?: string;
  }) {
    return (
      <select
        value={tratamiento}
        onChange={e => handleTratamientoChange(turnoId, e.target.value)}
        className={`w-full px-2 py-1.5 rounded-lg border bg-white dark:bg-slate-700 font-semibold ${
          !tratamiento
            ? 'border-amber-400 text-slate-400'
            : 'border-slate-300 dark:border-slate-600'
        } ${className}`}
      >
        {!tratamiento && <option value="">— Elegir servicio —</option>}
        {tratamiento && !catalogo[tratamiento] && (
          <option value={tratamiento}>{tratamiento}</option>
        )}
        {opcionesDepi.length > 0 && (
          <optgroup label="✨ Promos Depilación">
            {opcionesDepi.sort((a, b) => a.nombre.localeCompare(b.nombre)).map(item => (
              <option key={item.nombre} value={item.nombre}>{item.nombreDisplay}</option>
            ))}
          </optgroup>
        )}
        {opcionesUnas.length > 0 && (
          <optgroup label="💅 Uñas">
            {opcionesUnas.map(item => (
              <option key={item.nombre} value={item.nombre}>{item.nombreDisplay}</option>
            ))}
          </optgroup>
        )}
        {opcionesEstetica.length > 0 && (
          <optgroup label="⚡ Estética">
            {opcionesEstetica.map(item => (
              <option key={item.nombre} value={item.nombre}>{item.nombreDisplay}</option>
            ))}
          </optgroup>
        )}
        {opcionesPestanas.length > 0 && (
          <optgroup label="👁️ Pestañas">
            {opcionesPestanas.map(item => (
              <option key={item.nombre} value={item.nombre}>{item.nombreDisplay}</option>
            ))}
          </optgroup>
        )}
        {opcionesCombos.length > 0 && (
          <optgroup label="🎁 Combos">
            {opcionesCombos.sort((a, b) => a.nombre.localeCompare(b.nombre)).map(item => (
              <option key={item.nombre} value={item.nombre}>{item.nombreDisplay}</option>
            ))}
          </optgroup>
        )}
        <optgroup label="—">
          <option value="Otro">Otro</option>
        </optgroup>
      </select>
    );
  }

  if (turnos.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400 text-sm space-y-3">
        <p className="text-4xl">📅</p>
        <p>Sin turnos cargados para hoy</p>
        <button
          onClick={onAgregar}
          className="text-blue-600 font-bold hover:underline text-base"
        >
          + Agregar primer turno
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ══════════════════════════════════════════════════
          VISTA MOBILE — tarjetas nativas
          Visible en pantallas < md (768px)
      ══════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-3">
        {turnos.map((turno, idx) => {
          const itemCat = turno.tratamiento ? catalogo[turno.tratamiento] : null;
          const precioEsperado = itemCat?.precio ?? 0;
          const hayMismatch = precioEsperado > 0 && turno.monto_total !== precioEsperado;

          return (
            <div
              key={turno.id}
              className={`rounded-2xl border-2 overflow-hidden shadow-sm ${
                turno.asistencia === 'no_vino'
                  ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30'
                  : turno.estado_pago === 'completo'
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30'
                  : turno.estado_pago === 'seña'
                  ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950/30'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
              }`}
            >
              {/* ── Cabecera: hora + nombre + numero + eliminar ── */}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="09:00"
                  maxLength={5}
                  value={turno.horario}
                  onChange={e => onActualizar(turno.id, { horario: e.target.value })}
                  className="w-16 px-2 py-1.5 rounded-lg text-sm font-mono font-bold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-center"
                />
                <input
                  type="text"
                  value={turno.clienteNombre}
                  onChange={e => onActualizar(turno.id, { clienteNombre: e.target.value })}
                  placeholder="Nombre de la clienta"
                  className="flex-1 px-3 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-semibold"
                />
                <span className="shrink-0 text-xs text-slate-400 font-bold">#{idx + 1}</span>
                <button
                  onClick={() => onEliminar(turno.id)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 transition-colors text-lg leading-none"
                >
                  ×
                </button>
              </div>

              {/* ── Servicio ── */}
              <div className="px-4 pb-2 space-y-1.5">
                <SelectServicio
                  turnoId={turno.id}
                  tratamiento={turno.tratamiento}
                  className="text-sm"
                />
                <input
                  type="text"
                  value={turno.detalle || ''}
                  onChange={e => onActualizar(turno.id, { detalle: e.target.value })}
                  placeholder="Detalle adicional..."
                  className="w-full px-3 py-1 rounded-lg text-xs border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 italic"
                />
              </div>

              {/* ── Asistencia ── */}
              <div className="px-4 pb-3">
                <BotonesAsistencia
                  asistencia={turno.asistencia}
                  onChange={v => onActualizar(turno.id, { asistencia: v as any })}
                  size="lg"
                />
              </div>

              {/* ── Montos + pago ── */}
              <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 grid grid-cols-2 gap-3">
                {/* Total */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Total{hayMismatch && ' ⚠️'}
                  </p>
                  <div className="relative">
                    <NumeroInput
                      value={turno.monto_total}
                      onChange={v => onActualizar(turno.id, { monto_total: v })}
                      error={hayMismatch}
                      className="text-base font-bold"
                    />
                    {hayMismatch && (
                      <button
                        onClick={() => onActualizar(turno.id, { monto_total: precioEsperado })}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                      >
                        !
                      </button>
                    )}
                  </div>
                  {hayMismatch && (
                    <p className="text-[10px] text-red-500 mt-0.5">
                      Catálogo: ${precioEsperado.toLocaleString('es-AR')} — tocá ! para fijar
                    </p>
                  )}
                </div>

                {/* Seña */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Seña cobrada</p>
                  <NumeroInput
                    value={turno.seña_pagada}
                    onChange={v => onActualizar(turno.id, { seña_pagada: v })}
                    className="text-base font-bold"
                  />
                </div>

                {/* Estado */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Estado</p>
                  {turno.estado_pago === 'completo' ? (
                    <button
                      onClick={() => onActualizar(turno.id, { seña_pagada: 0 })}
                      className="px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold"
                    >
                      ✓ Pagado
                    </button>
                  ) : turno.asistencia === 'presente' && turno.monto_total > 0 ? (
                    <button
                      onClick={() => onActualizar(turno.id, { seña_pagada: turno.monto_total })}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 ${
                        turno.estado_pago === 'seña'
                          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-500'
                      }`}
                    >
                      {turno.estado_pago === 'seña' ? '⏳ Con seña' : '○ Sin pago'}
                    </button>
                  ) : turno.asistencia === 'no_vino' ? (
                    <span className="px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold">
                      ✗ No vino
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 text-xs">
                      —
                    </span>
                  )}
                </div>

                {/* Método de pago */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Forma de pago</p>
                  <select
                    value={turno.metodo_pago}
                    onChange={e => onActualizar(turno.id, { metodo_pago: e.target.value as any })}
                    className="w-full px-2 py-1.5 rounded-lg text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-medium"
                  >
                    <option value="efectivo">💵 Efectivo</option>
                    <option value="transferencia">🏦 Transferencia</option>
                    <option value="otro">📱 Otro</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════
          VISTA DESKTOP — tabla compacta
          Visible en pantallas ≥ md (768px)
      ══════════════════════════════════════════════════ */}
      <div className="hidden md:block overflow-x-auto rounded-lg">
        <div className="min-w-[820px] space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[64px_130px_1fr_60px_76px_76px_42px_60px_30px] gap-x-2 px-3 py-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
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

          {turnos.map((turno, idx) => {
            const itemCat = turno.tratamiento ? catalogo[turno.tratamiento] : null;
            const precioEsperado = itemCat?.precio ?? 0;
            const hayMismatch = precioEsperado > 0 && turno.monto_total !== precioEsperado;

            return (
              <div
                key={turno.id}
                className={`grid grid-cols-[64px_130px_1fr_60px_76px_76px_42px_60px_30px] gap-x-2 items-center px-3 py-2 rounded-lg border ${
                  idx % 2 === 0
                    ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                    : 'bg-slate-50 dark:bg-slate-700/40 border-slate-100 dark:border-slate-600'
                } hover:border-blue-300 dark:hover:border-blue-600 transition-colors`}
              >
                {/* Hora */}
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="09:00"
                    maxLength={5}
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

                {/* Tratamiento + Detalle */}
                <div className="flex flex-col gap-1">
                  <SelectServicio
                    turnoId={turno.id}
                    tratamiento={turno.tratamiento}
                    className="text-xs py-1 rounded"
                  />
                  <input
                    type="text"
                    value={turno.detalle || ''}
                    onChange={e => onActualizar(turno.id, { detalle: e.target.value })}
                    placeholder="Detalle adicional..."
                    className="w-full px-1 py-0.5 rounded text-xs border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 italic"
                  />
                </div>

                {/* Asistencia */}
                <div className="flex gap-1 justify-center">
                  <BotonesAsistencia
                    asistencia={turno.asistencia}
                    onChange={v => onActualizar(turno.id, { asistencia: v as any })}
                    size="sm"
                  />
                </div>

                {/* Total */}
                <div>
                  <div className="relative">
                    <NumeroInput
                      value={turno.monto_total}
                      onChange={v => onActualizar(turno.id, { monto_total: v })}
                      error={hayMismatch}
                    />
                    {hayMismatch && (
                      <span
                        title={`⚠️ El precio configurado es $${precioEsperado.toLocaleString('es-AR')}. Hacé clic para restaurar.`}
                        onClick={() => onActualizar(turno.id, { monto_total: precioEsperado })}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600"
                      >!</span>
                    )}
                  </div>
                </div>

                {/* Seña */}
                <div>
                  <NumeroInput
                    value={turno.seña_pagada}
                    onChange={v => onActualizar(turno.id, { seña_pagada: v })}
                  />
                </div>

                {/* Estado de pago */}
                <div className="flex justify-center">
                  {turno.estado_pago === 'completo' ? (
                    <button
                      onClick={() => onActualizar(turno.id, { seña_pagada: 0 })}
                      title="Cobrado — click para deshacer"
                      className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold bg-green-500 text-white shadow-sm hover:bg-green-600 transition-colors"
                    >
                      ✓
                    </button>
                  ) : turno.asistencia === 'presente' && turno.monto_total > 0 ? (
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
            );
          })}
        </div>
      </div>

      {/* Botón agregar — visible en ambas vistas */}
      <button
        onClick={onAgregar}
        className="w-full px-4 py-3 rounded-xl bg-blue-600 dark:bg-blue-700 text-white font-bold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
      >
        ➕ Agregar Turno
      </button>
    </div>
  );
}
