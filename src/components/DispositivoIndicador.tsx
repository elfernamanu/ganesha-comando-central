'use client';

import { useState } from 'react';
import { useDispositivo } from '@/hooks/useDispositivo';

export default function DispositivoIndicador() {
  const { info, guardando, guardarAlias } = useDispositivo();
  const [modal, setModal] = useState(false);
  const [input, setInput]  = useState('');

  if (!info) return null;

  const abrirModal = () => {
    setInput(info.alias || info.nombre);
    setModal(true);
  };

  const guardar = async () => {
    if (!input.trim()) return;
    await guardarAlias(input.trim());
    setModal(false);
  };

  return (
    <>
      {/* ── Pill indicador ── */}
      <button
        onClick={abrirModal}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all
          ${info.registrado
            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
            : 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 animate-pulse'
          }`}
        title={info.registrado ? `ID: ${info.id.slice(0, 8)}...` : 'Tocar para registrar este dispositivo'}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${info.registrado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {info.registrado ? info.alias : '⚠️ Sin registrar'}
      </button>

      {/* ── Modal para nombrar el dispositivo ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {info.registrado ? 'Renombrar dispositivo' : 'Registrar dispositivo'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ID: <span className="font-mono">{info.id.slice(0, 16)}...</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Detectado: {info.nombre}
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                Nombre del dispositivo
              </label>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') setModal(false); }}
                placeholder="Ej: PC Dueña, Celular Dueña, Secretaria..."
                autoFocus
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Sugerencias: PC Dueña · Celular Dueña · Secretaria
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando || !input.trim()}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {guardando ? '⏳ Guardando...' : '✅ Guardar'}
              </button>
            </div>

            {info.registrado && (
              <button
                onClick={() => guardarAlias('').then(() => setModal(false))}
                className="w-full text-xs text-red-400 hover:text-red-600 text-center"
              >
                Borrar registro de este dispositivo
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
