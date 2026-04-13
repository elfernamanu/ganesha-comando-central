'use client';

import { useState } from 'react';
import { GastosFormProps, Gasto } from '../types/index';
import { CATEGORIAS_GASTO } from '../constants/index';

export default function GastosForm({ onAgregar }: GastosFormProps) {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState<'alquiler' | 'servicios' | 'otros'>('otros');
  const [notas, setNotas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!concepto.trim() || !monto.trim()) {
      alert('Completa concepto y monto');
      return;
    }

    const montoNum = parseInt(monto);
    if (montoNum <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    onAgregar({
      concepto: concepto.trim(),
      monto: montoNum,
      categoria,
      notas: notas.trim() || undefined,
    });

    // Limpiar formulario
    setConcepto('');
    setMonto('');
    setNotas('');
    setCategoria('otros');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Categoría */}
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
            Categoría
          </label>
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value as any)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
          >
            {CATEGORIAS_GASTO.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Concepto */}
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
            Concepto
          </label>
          <input
            type="text"
            value={concepto}
            onChange={e => setConcepto(e.target.value)}
            placeholder="Ej: Alquiler, Luz, Agua..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
          />
        </div>

        {/* Monto */}
        <div>
          <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
            Monto ($)
          </label>
          <input
            type="number"
            value={monto}
            onChange={e => setMonto(e.target.value.replace(/\D/g, ''))}
            onFocus={e => e.target.select()}
            placeholder="0"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm font-medium"
          />
        </div>

        {/* Botón */}
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full px-4 py-2 rounded-lg bg-emerald-600 dark:bg-emerald-700 text-white font-bold hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors text-sm"
          >
            ➕ Agregar Gasto
          </button>
        </div>
      </div>

      {/* Notas */}
      <input
        type="text"
        value={notas}
        onChange={e => setNotas(e.target.value)}
        placeholder="Notas (opcional)"
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
      />
    </form>
  );
}
