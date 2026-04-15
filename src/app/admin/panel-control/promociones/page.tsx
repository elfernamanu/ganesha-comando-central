'use client';

import { useState, useEffect } from 'react';
import { guardarCombos } from '../_shared/catalogoPromos';

interface Combo {
  numero: number;
  nombre: string;
  descripcion: string;
  servicios: {
    depilacion: boolean;
    unas: boolean;
    estetica: boolean;
    pestanas: boolean;
  };
  precio: number;
  activo: boolean;
}

const LS_COMBOS = 'ganesha_catalog_combos_raw'; // guarda el formato completo Combo[]

export default function PromocionesPage() {
  const [combos, setCombos] = useState<Combo[]>([]);

  // Cargar combos guardados al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_COMBOS);
      if (stored) {
        const parsed = JSON.parse(stored) as Combo[];
        if (Array.isArray(parsed)) setCombos(parsed);
      }
    } catch {
      // silencioso
    }
  }, []);
  const [guardando, setGuardando] = useState(false);

  const agregarCombo = () => {
    const nuevoNumero = Math.max(...combos.map(c => c.numero), 0) + 1;
    setCombos(prev => [...prev, {
      numero: nuevoNumero,
      nombre: '',
      descripcion: '',
      servicios: { depilacion: false, unas: false, estetica: false, pestanas: false },
      precio: 0,
      activo: true,
    }]);
  };

  const eliminarCombo = (numero: number) => setCombos(prev => prev.filter(c => c.numero !== numero));

  const actualizarCombo = (numero: number, campo: keyof Combo, valor: unknown) => {
    setCombos(prev => prev.map(c => c.numero === numero ? { ...c, [campo]: valor } : c));
  };

  const actualizarServicio = (numero: number, servicio: keyof Combo['servicios'], checked: boolean) => {
    setCombos(prev => prev.map(c => c.numero === numero
      ? { ...c, servicios: { ...c.servicios, [servicio]: checked } }
      : c
    ));
  };

  const guardar = async () => {
    setGuardando(true);
    // Guardar raw para recuperar en próxima sesión
    try { localStorage.setItem(LS_COMBOS, JSON.stringify(combos)); } catch {}
    // Sincronizar catálogo simplificado para que Turnos lo lea
    guardarCombos(combos);
    // Nota: el webhook n8n es opcional — los combos ya están en localStorage.
    // Disparar sin await para no bloquear si n8n está caído.
    fetch('/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'actualizar_combos', combos }),
    }).catch(() => { /* silencioso si n8n está offline */ });
    setGuardando(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">🎁 Combos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Promociones con múltiples servicios</p>
        </div>
        <div className="flex gap-2">
          <button onClick={agregarCombo} className="px-4 py-2 rounded-lg font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-colors">
            + Nuevo Combo
          </button>
          <button onClick={guardar} disabled={guardando} className="px-5 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {guardando ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {combos.map((combo) => (
          <div key={combo.numero} className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-bold text-sm">
                  Promo Combo {combo.numero}
                </span>
              </div>
              <button onClick={() => eliminarCombo(combo.numero)} className="px-3 py-2 rounded-lg text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 transition-colors">
                🗑️
              </button>
            </div>

            {/* Nombre y Descripción */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nombre del combo</label>
                <input
                  value={combo.nombre}
                  onChange={(e) => actualizarCombo(combo.numero, 'nombre', e.target.value)}
                  placeholder="Ej: Combo Depilación + Uñas"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Precio</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-400">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={combo.precio ? combo.precio.toLocaleString('es-AR') : ''}
                    onChange={(e) => actualizarCombo(combo.numero, 'precio', parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Descripción</label>
              <textarea
                value={combo.descripcion}
                onChange={(e) => actualizarCombo(combo.numero, 'descripcion', e.target.value)}
                placeholder="Ej: Depilación completa + manicura"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 resize-none"
              />
            </div>

            {/* Servicios */}
            <div>
              <label className="text-xs text-slate-400 block mb-3 font-semibold">Servicios incluidos</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Depilación */}
                <label className="flex items-center gap-2 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={combo.servicios.depilacion}
                    onChange={(e) => actualizarServicio(combo.numero, 'depilacion', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">✨ Depilación</span>
                </label>

                {/* Uñas */}
                <label className="flex items-center gap-2 p-3 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={combo.servicios.unas}
                    onChange={(e) => actualizarServicio(combo.numero, 'unas', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">💅 Uñas</span>
                </label>

                {/* Estética */}
                <label className="flex items-center gap-2 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={combo.servicios.estetica}
                    onChange={(e) => actualizarServicio(combo.numero, 'estetica', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">🌟 Estética</span>
                </label>

                {/* Pestañas */}
                <label className="flex items-center gap-2 p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={combo.servicios.pestanas}
                    onChange={(e) => actualizarServicio(combo.numero, 'pestanas', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">👁️ Pestañas</span>
                </label>
              </div>
            </div>

            {/* Status */}
            <div className="flex justify-end">
              <button
                onClick={() => actualizarCombo(combo.numero, 'activo', !combo.activo)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  combo.activo
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {combo.activo ? '✓ Activo' : '✗ Inactivo'}
              </button>
            </div>
          </div>
        ))}

        {combos.length === 0 && (
          <div className="text-center py-12 text-slate-400">No hay combos. Creá uno nuevo.</div>
        )}
      </div>
    </div>
  );
}
