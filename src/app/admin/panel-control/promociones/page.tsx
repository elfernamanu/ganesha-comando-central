'use client';

import { useState } from 'react';

interface Promocion {
  id: number;
  nombre: string;
  descuento_pct: number;
  valido_hasta: string;
  activo: boolean;
}

export default function PromocionesPage() {
  const [promos, setPromos] = useState<Promocion[]>([
    { id: 1, nombre: 'Combo Verano', descuento_pct: 20, valido_hasta: '2026-03-31', activo: true },
  ]);
  const [guardando, setGuardando] = useState(false);

  const agregar = () => setPromos(prev => [...prev, {
    id: Date.now(), nombre: '', descuento_pct: 10, valido_hasta: '', activo: true,
  }]);

  const eliminar = (id: number) => setPromos(prev => prev.filter(p => p.id !== id));

  const actualizar = (id: number, campo: keyof Promocion, valor: string | number | boolean) =>
    setPromos(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));

  const guardar = async () => {
    setGuardando(true);
    await fetch('/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'actualizar_promociones', promos }),
    }).catch(() => {});
    setGuardando(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">📢 Promociones</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Descuentos y ofertas activas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={agregar} className="px-4 py-2 rounded-lg font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-colors">
            + Nueva
          </button>
          <button onClick={guardar} disabled={guardando} className="px-5 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {guardando ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {promos.map((p) => (
          <div key={p.id} className="flex flex-wrap gap-4 items-center p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex-1 min-w-40">
              <label className="text-xs text-slate-400 block mb-1">Nombre</label>
              <input value={p.nombre} onChange={(e) => actualizar(p.id, 'nombre', e.target.value)}
                placeholder="Ej: Combo Verano"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" />
            </div>
            <div className="w-28">
              <label className="text-xs text-slate-400 block mb-1">Descuento %</label>
              <input type="number" value={p.descuento_pct} onChange={(e) => actualizar(p.id, 'descuento_pct', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" />
            </div>
            <div className="w-36">
              <label className="text-xs text-slate-400 block mb-1">Válido hasta</label>
              <input type="date" value={p.valido_hasta} onChange={(e) => actualizar(p.id, 'valido_hasta', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700" />
            </div>
            <button onClick={() => actualizar(p.id, 'activo', !p.activo)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${p.activo ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
              {p.activo ? '✓ Activa' : '✗ Inactiva'}
            </button>
            <button onClick={() => eliminar(p.id)} className="px-3 py-2 rounded-lg text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 transition-colors">
              🗑️
            </button>
          </div>
        ))}
        {promos.length === 0 && (
          <div className="text-center py-12 text-slate-400">No hay promociones. Creá una nueva.</div>
        )}
      </div>
    </div>
  );
}
