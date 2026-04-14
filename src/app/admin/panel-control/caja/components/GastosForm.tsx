'use client';

import { useState } from 'react';
import { GastosFormProps } from '../types/index';
import { CATEGORIAS_GASTO } from '../constants/index';

function formatMonto(val: string): string {
  const num = val.replace(/\D/g, '');
  if (!num) return '';
  return parseInt(num, 10).toLocaleString('es-AR');
}

export default function GastosForm({ onAgregar }: GastosFormProps) {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState<'alquiler' | 'servicios' | 'otros'>('otros');
  const [notas, setNotas] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepto.trim() || !monto) return;
    const montoNum = parseInt(monto.replace(/\D/g, ''), 10);
    if (montoNum <= 0) return;
    onAgregar({ concepto: concepto.trim(), monto: montoNum, categoria, notas: notas.trim() || undefined });
    setConcepto(''); setMonto(''); setNotas(''); setCategoria('otros');
  };

  const inputCls = "w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs";
  const labelCls = "text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide block";

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        {/* Categoría */}
        <div>
          <label className={labelCls}>Categoría</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value as 'alquiler' | 'servicios' | 'otros')}
            className={inputCls}>
            {CATEGORIAS_GASTO.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Concepto */}
        <div>
          <label className={labelCls}>Concepto</label>
          <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)}
            placeholder="Ej: Alquiler, Luz, Agua..." className={inputCls} />
        </div>

        {/* Monto */}
        <div>
          <label className={labelCls}>Monto ($)</label>
          <input
            type="text" inputMode="numeric"
            value={monto}
            onChange={e => setMonto(formatMonto(e.target.value))}
            onFocus={e => e.target.select()}
            placeholder="0"
            className={`${inputCls} font-mono`}
          />
        </div>

        {/* Botón */}
        <div className="flex items-end">
          <button type="submit"
            className="w-full px-3 py-1 rounded-lg bg-emerald-600 dark:bg-emerald-700 text-white font-bold hover:bg-emerald-700 transition-colors text-xs">
            + Agregar Gasto
          </button>
        </div>
      </div>

      {/* Notas */}
      <input type="text" value={notas} onChange={e => setNotas(e.target.value)}
        placeholder="Notas (opcional)" className={inputCls} />
    </form>
  );
}
