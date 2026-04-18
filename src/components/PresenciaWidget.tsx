'use client';

import { useState } from 'react';
import { usePresencia } from '@/hooks/usePresencia';

const PAGINA_LABELS: [string, string][] = [
  ['/admin/panel-control/turnos', 'Turnos'],
  ['/admin/panel-control/caja',   'Caja'],
  ['/admin/panel-control',        'Panel'],
  ['/',                           'Agenda'],
];

function paginaLabel(pagina: string): string {
  for (const [route, label] of PAGINA_LABELS) {
    if (pagina.startsWith(route)) return label;
  }
  return pagina;
}

const SUGERENCIAS = ['PC Dueña', 'Celular', 'PC Casa', 'Tablet'];

export function PresenciaWidget() {
  const { dispositivos, deviceId, deviceName, setDeviceName } = usePresencia();
  const [editando, setEditando] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const sinNombre = !deviceName;
  const yo        = dispositivos.find(d => d.device_id === deviceId);
  const otros     = dispositivos.filter(d => d.device_id !== deviceId);

  const iniciarEdicion = () => {
    setInputVal(deviceName);
    setEditando(true);
  };

  const guardar = () => {
    if (inputVal.trim()) setDeviceName(inputVal.trim());
    setEditando(false);
  };

  return (
    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">
        Dispositivos activos
      </p>

      {/* Mi dispositivo */}
      <div className="flex items-center gap-2 px-1 py-1 rounded-lg">
        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse" />

        {sinNombre || editando ? (
          <div className="flex-1 space-y-1">
            <input
              autoFocus
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Nombre de este dispositivo..."
              className="w-full text-xs px-2 py-1 rounded border border-violet-300 dark:border-violet-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-violet-400"
              onKeyDown={e => {
                if (e.key === 'Enter') guardar();
                if (e.key === 'Escape') setEditando(false);
              }}
            />
            {/* Sugerencias rápidas */}
            <div className="flex gap-1 flex-wrap">
              {SUGERENCIAS.map(s => (
                <button
                  key={s}
                  onClick={() => { setInputVal(s); }}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={guardar}
              className="text-[10px] px-3 py-0.5 bg-violet-600 text-white rounded font-bold hover:bg-violet-700 transition-colors"
            >
              Guardar
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-green-700 dark:text-green-400 truncate block">
                {deviceName}
                <span className="font-normal text-gray-400 dark:text-gray-500 ml-1">(vos)</span>
              </span>
              {yo && (
                <span className="text-[9px] text-gray-400 dark:text-gray-500">{paginaLabel(yo.pagina)}</span>
              )}
            </div>
            <button
              onClick={iniciarEdicion}
              title="Cambiar nombre"
              className="text-[11px] text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 shrink-0 transition-colors"
            >
              ✏️
            </button>
          </>
        )}
      </div>

      {/* Otros dispositivos */}
      {otros.map(d => (
        <div key={d.device_id} className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/40">
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-gray-600 dark:text-gray-300 truncate block">{d.device_name}</span>
            <span className="text-[9px] text-gray-400 dark:text-gray-500">{paginaLabel(d.pagina)}</span>
          </div>
        </div>
      ))}

      {/* Sin datos aún */}
      {dispositivos.length === 0 && (
        <p className="text-[10px] text-gray-300 dark:text-gray-600 px-1 py-1">Conectando...</p>
      )}
    </div>
  );
}
