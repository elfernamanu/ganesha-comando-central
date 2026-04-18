'use client';

import { useState } from 'react';
import { useDispositivo } from '@/hooks/useDispositivo';

interface Props {
  seccion: string;  // "Servicios y Precios", "Control de Caja", etc.
}

export default function AccesoRestringido({ seccion }: Props) {
  const { info, guardando, guardarAlias } = useDispositivo();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [alias, setAlias]   = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError]   = useState('');

  // Todavía cargando — no bloquear aún
  if (info === null) return null;

  // Dispositivo registrado — no bloquear
  if (info.registrado) return null;

  const registrar = async () => {
    if (!alias.trim()) return;
    setError('');
    const res = await guardarAlias(alias.trim(), codigo.trim() || undefined);
    if (res.ok) {
      window.location.reload(); // recargar con acceso
    } else if (res.codigoInvalido) {
      setError('Código incorrecto. Pedíselo a la dueña.');
      setCodigo('');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-6">
      {/* Ícono y título */}
      <div className="space-y-2">
        <div className="text-6xl">🔒</div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">
          Acceso restringido
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
          <strong>{seccion}</strong> solo es accesible desde dispositivos registrados.
        </p>
      </div>

      {/* Info del dispositivo actual */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3 text-sm space-y-1 w-full max-w-sm">
        <p className="font-bold text-amber-800 dark:text-amber-300">⚠️ Dispositivo no reconocido</p>
        <p className="text-amber-700 dark:text-amber-400 text-xs">{info.nombre}</p>
        <p className="font-mono text-[10px] text-amber-500 dark:text-amber-500 break-all">{info.id}</p>
      </div>

      {!mostrarForm ? (
        <div className="space-y-3 w-full max-w-sm">
          <button
            onClick={() => { setAlias(info.nombre); setMostrarForm(true); }}
            className="w-full py-3 rounded-2xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors"
          >
            Soy la dueña — registrar este dispositivo
          </button>
          <p className="text-xs text-slate-400">
            Si sos la secretaria, solo podés acceder a la sección de Turnos.
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1.5 text-left">
              Nombre del dispositivo
            </label>
            <input
              value={alias}
              onChange={e => setAlias(e.target.value)}
              placeholder="PC Dueña · Celular Dueña..."
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide block mb-1.5 text-left">
              Código de registro
            </label>
            <input
              type="password"
              value={codigo}
              onChange={e => { setCodigo(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && registrar()}
              placeholder="Código secreto..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {error && (
            <p className="text-sm font-bold text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 text-left">
              ⛔ {error}
            </p>
          )}

          <div className="flex gap-2">
            <button onClick={() => setMostrarForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm font-medium">
              Cancelar
            </button>
            <button onClick={registrar} disabled={guardando || !alias.trim()}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-50">
              {guardando ? '⏳...' : '🔓 Registrar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
