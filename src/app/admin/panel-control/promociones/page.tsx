'use client';

import { useState, useEffect, useRef } from 'react';
import { guardarCombos, invalidarCatalogoCache } from '../_shared/catalogoPromos';

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

const LS_COMBOS = 'ganesha_catalog_combos_raw';

export default function PromocionesPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado] = useState<'ok' | 'error' | ''>('');
  const [autoGuardado, setAutoGuardado] = useState<'idle' | 'pendiente' | 'ok' | 'error'>('idle');
  const ultimoGuardadoManual = useRef(0);
  const cargaCompleta = useRef(false);
  // Solo true cuando el servidor respondió OK — bloquea auto-save si el servidor estaba caído
  const servidorConfirmado = useRef(false);

  // Cargar: primero localStorage (inmediato), luego servidor (si tiene datos)
  useEffect(() => {
    // 1. localStorage primero
    try {
      const stored = localStorage.getItem(LS_COMBOS);
      if (stored) {
        const parsed = JSON.parse(stored) as Combo[];
        if (Array.isArray(parsed)) setCombos(parsed);
      }
    } catch { /* silencioso */ }

    // 2. Servidor — si tiene datos gana (versión más fresca)
    fetch('/api/combos')
      .then(r => r.json())
      .then((data: { ok: boolean; datos?: unknown }) => {
        if (data.ok) servidorConfirmado.current = true; // servidor respondió OK
        if (data.ok && Array.isArray(data.datos) && (data.datos as unknown[]).length > 0) {
          const fromServer = data.datos as Combo[];
          setCombos(fromServer);
          try { localStorage.setItem(LS_COMBOS, JSON.stringify(fromServer)); } catch { /* silencioso */ }
          guardarCombos(fromServer);
          invalidarCatalogoCache();
        }
      })
      .catch(() => { /* servidor caído — servidorConfirmado queda false */ })
      .finally(() => { cargaCompleta.current = true; });
  }, []);

  // Auto-guardado 3s después de cada cambio
  useEffect(() => {
    if (!cargaCompleta.current || !servidorConfirmado.current || combos.length === 0) return;
    setAutoGuardado('pendiente');
    const timer = setTimeout(async () => {
      if (Date.now() - ultimoGuardadoManual.current < 5000) return;
      try {
        try { localStorage.setItem(LS_COMBOS, JSON.stringify(combos)); } catch { /* silencioso */ }
        guardarCombos(combos);
        invalidarCatalogoCache();
        const res = await fetch('/api/combos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datos: combos }) });
        const data = await res.json() as { ok: boolean };
        if (data.ok) { setAutoGuardado('ok'); setTimeout(() => setAutoGuardado('idle'), 3000); }
        else { setAutoGuardado('error'); setTimeout(() => setAutoGuardado('idle'), 4000); }
      } catch { setAutoGuardado('error'); setTimeout(() => setAutoGuardado('idle'), 4000); }
    }, 3000);
    return () => clearTimeout(timer);
  }, [combos]);

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
    ultimoGuardadoManual.current = Date.now();
    setAutoGuardado('idle');
    setGuardando(true);
    setEstado('');
    try {
      // 1. localStorage
      try { localStorage.setItem(LS_COMBOS, JSON.stringify(combos)); } catch { /* silencioso */ }
      // 2. Catálogo simplificado para Turnos
      guardarCombos(combos);
      invalidarCatalogoCache();
      // 3. Servidor
      const res = await fetch('/api/combos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: combos }),
      });
      const data = await res.json() as { ok: boolean };
      if (data.ok) servidorConfirmado.current = true;
      setEstado(data.ok ? 'ok' : 'error');
    } catch {
      setEstado('error');
    } finally {
      setGuardando(false);
      setTimeout(() => setEstado(''), 3000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">🎁 Combos</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Promociones con múltiples servicios</p>
        </div>
        <div className="flex items-center gap-2">
          {autoGuardado !== 'idle' && (
            <span className={`text-xs font-semibold flex items-center gap-1 ${autoGuardado === 'ok' ? 'text-emerald-600 dark:text-emerald-400' : autoGuardado === 'error' ? 'text-amber-500' : 'text-slate-400'}`}>
              {autoGuardado === 'pendiente' && <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin inline-block" />}
              {autoGuardado === 'ok' ? '✓ guardado' : autoGuardado === 'error' ? '⚠️ sin conexión' : 'guardando...'}
            </span>
          )}
          {estado === 'ok' && autoGuardado === 'idle' && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">✓ guardado en servidor</span>
          )}
          {estado === 'error' && (
            <span className="text-xs font-medium text-red-500">✗ error al guardar</span>
          )}
          <button onClick={agregarCombo} className="px-3 py-1.5 rounded-lg font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-colors">
            + Nuevo Combo
          </button>
          <button onClick={guardar} disabled={guardando} className="px-4 py-1.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {guardando ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {combos.map((combo) => (
          <div key={combo.numero} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-2">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 block mb-0.5">Nombre del combo</label>
                <input
                  value={combo.nombre}
                  onChange={(e) => actualizarCombo(combo.numero, 'nombre', e.target.value)}
                  placeholder="Ej: Combo Depilación + Uñas"
                  className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-0.5">Precio</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-400">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={combo.precio ? combo.precio.toLocaleString('es-AR') : ''}
                    onChange={(e) => actualizarCombo(combo.numero, 'precio', parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                    onFocus={(e) => e.currentTarget.select()}
                    placeholder="0"
                    className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-0.5">Descripción</label>
              <textarea
                value={combo.descripcion}
                onChange={(e) => actualizarCombo(combo.numero, 'descripcion', e.target.value)}
                placeholder="Ej: Depilación completa + manicura"
                rows={2}
                className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 resize-none text-sm"
              />
            </div>

            {/* Servicios */}
            <div>
              <label className="text-xs text-slate-400 block mb-1 font-semibold">Servicios incluidos</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="flex items-center gap-2 p-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={combo.servicios.depilacion}
                    onChange={(e) => actualizarServicio(combo.numero, 'depilacion', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">✨ Depilación</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20 cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={combo.servicios.unas}
                    onChange={(e) => actualizarServicio(combo.numero, 'unas', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">💅 Uñas</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={combo.servicios.estetica}
                    onChange={(e) => actualizarServicio(combo.numero, 'estetica', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">🌟 Estética</span>
                </label>

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
