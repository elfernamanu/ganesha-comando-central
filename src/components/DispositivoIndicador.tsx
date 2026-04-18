'use client';

import { useState } from 'react';
import { useDispositivo } from '@/hooks/useDispositivo';

export default function DispositivoIndicador() {
  const { info, guardando, guardarAlias } = useDispositivo();
  const [modal, setModal]   = useState(false);
  const [alias, setAlias]   = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError]   = useState('');

  if (!info) return null;

  const abrirModal = () => {
    setAlias(info.alias || info.nombre);
    setCodigo('');
    setError('');
    setModal(true);
  };

  const guardar = async () => {
    if (!alias.trim()) return;
    setError('');
    const resultado = await guardarAlias(alias.trim(), codigo.trim() || undefined);
    if (resultado.ok) {
      setModal(false);
    } else if (resultado.codigoInvalido) {
      setError('Código incorrecto. Pedíselo a la dueña.');
      setCodigo('');
    } else {
      setError(resultado.error);
    }
  };

  return (
    <>
      {/* Pill indicador */}
      <button
        onClick={abrirModal}
        title={`ID: ${info.id.slice(0, 8)}...`}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0
          ${info.registrado
            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
            : 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 animate-pulse'
          }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.registrado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        <span className="max-w-[90px] truncate">
          {info.registrado ? info.alias : '⚠️ Sin registrar'}
        </span>
      </button>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">

            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {info.registrado ? 'Renombrar dispositivo' : '🔐 Registrar dispositivo'}
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">{info.id.slice(0, 20)}...</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{info.nombre}</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">
                  Nombre del dispositivo
                </label>
                <input
                  value={alias}
                  onChange={e => setAlias(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardar()}
                  placeholder="PC Dueña · Celular Dueña · Secretaria..."
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Código solo para dispositivos nuevos */}
              {!info.registrado && (
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1">
                    Código de registro
                  </label>
                  <input
                    type="password"
                    value={codigo}
                    onChange={e => { setCodigo(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && guardar()}
                    placeholder="Pedíselo a la dueña"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Requerido para acceder a precios y caja
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2">
                ⛔ {error}
              </p>
            )}

            <div className="flex gap-2">
              <button onClick={() => setModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando || !alias.trim()}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors">
                {guardando ? '⏳...' : '✅ Guardar'}
              </button>
            </div>

            {info.registrado && (
              <button onClick={() => guardarAlias('').then(() => setModal(false))}
                className="w-full text-xs text-red-400 hover:text-red-600 text-center pt-1">
                Borrar registro de este dispositivo
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
