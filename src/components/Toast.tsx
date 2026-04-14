'use client';

import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type ToastTipo = 'exito' | 'error' | 'info';

interface ToastItem {
  id:      number;
  tipo:    ToastTipo;
  titulo:  string;
  detalle?: string;
}

interface ToastContextValue {
  mostrar: (titulo: string, tipo?: ToastTipo, detalle?: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────
const ToastCtx = createContext<ToastContextValue>({ mostrar: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

// ── Proveedor (va en el layout) ───────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const mostrar = useCallback((titulo: string, tipo: ToastTipo = 'exito', detalle?: string) => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, tipo, titulo, detalle }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const cerrar = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastCtx.Provider value={{ mostrar }}>
      {children}

      {/* ── Lista de toasts — arriba a la derecha ── */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={[
              'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border',
              'animate-in slide-in-from-right-4 duration-300',
              'min-w-[260px] max-w-[340px]',
              t.tipo === 'exito' ? 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-700'
              : t.tipo === 'error' ? 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-700'
              : 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-700',
            ].join(' ')}
          >
            {/* Ícono */}
            <span className="text-lg shrink-0 mt-0.5">
              {t.tipo === 'exito' ? '✅' : t.tipo === 'error' ? '❌' : 'ℹ️'}
            </span>

            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold leading-tight ${
                t.tipo === 'exito' ? 'text-emerald-700 dark:text-emerald-300'
                : t.tipo === 'error' ? 'text-red-700 dark:text-red-300'
                : 'text-blue-700 dark:text-blue-300'
              }`}>
                {t.titulo}
              </p>
              {t.detalle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {t.detalle}
                </p>
              )}
            </div>

            {/* Cerrar */}
            <button
              onClick={() => cerrar(t.id)}
              className="text-slate-300 hover:text-slate-500 dark:hover:text-slate-300 shrink-0 text-xs mt-0.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
