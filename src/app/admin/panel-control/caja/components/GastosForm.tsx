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
  const [concepto, setConcepto]   = useState('');
  const [monto,    setMonto]      = useState('');
  const [categoria, setCategoria] = useState<'alquiler' | 'servicios' | 'otros'>('otros');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepto.trim() || !monto) return;
    const montoNum = parseInt(monto.replace(/\D/g, ''), 10);
    if (montoNum <= 0) return;
    onAgregar({ concepto: concepto.trim(), monto: montoNum, categoria });
    setConcepto(''); setMonto(''); setCategoria('otros');
  };

  const inp = "px-2 py-1 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs";

  return (
    <form onSubmit={handleSubmit}
      className="flex flex-wrap gap-1.5 items-center px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">

      {/* Categoría */}
      <select value={categoria} onChange={e => setCategoria(e.target.value as 'alquiler' | 'servicios' | 'otros')}
        className={`${inp} w-36 shrink-0`}>
        {CATEGORIAS_GASTO.map(cat => (
          <option key={cat.value} value={cat.value}>{cat.label}</option>
        ))}
      </select>

      {/* Concepto */}
      <input type="text" value={concepto} onChange={e => setConcepto(e.target.value)}
        placeholder="Concepto (Luz, Alquiler...)"
        className={`${inp} flex-1 min-w-[120px]`} />

      {/* Monto */}
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] text-slate-400">$</span>
        <input type="text" inputMode="numeric"
          value={monto}
          onChange={e => setMonto(formatMonto(e.target.value))}
          onFocus={e => e.target.select()}
          placeholder="0"
          className={`${inp} w-24 font-mono text-right`} />
      </div>

      {/* Botón */}
      <button type="submit"
        className="px-3 py-1 rounded-lg bg-emerald-600 dark:bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0">
        + Agregar
      </button>
    </form>
  );
}
