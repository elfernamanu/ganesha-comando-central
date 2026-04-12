'use client';

import { useState, useEffect } from 'react';

interface Servicio {
  id: number;
  nombre: string;
  duracion_minutos: number;
  precio: number;
  activo: boolean;
}

const INICIAL: Servicio[] = [
  { id: 1, nombre: 'Depilación', duracion_minutos: 30, precio: 8000, activo: true },
  { id: 2, nombre: 'Uñas', duracion_minutos: 90, precio: 15000, activo: true },
  { id: 3, nombre: 'Estética Corporal', duracion_minutos: 60, precio: 20000, activo: true },
  { id: 4, nombre: 'Pestañas', duracion_minutos: 120, precio: 18000, activo: true },
];

export default function PreciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>(INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const actualizar = (id: number, campo: keyof Servicio, valor: string | number | boolean) => {
    setServicios(prev => prev.map(s => s.id === id ? { ...s, [campo]: valor } : s));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'actualizar_precios', servicios }),
      });
      if (res.ok) {
        setMensaje('✅ Precios guardados correctamente');
      } else {
        setMensaje('⚠️ Error al guardar — revisá n8n');
      }
    } catch {
      setMensaje('⚠️ Sin conexión al servidor');
    }
    setGuardando(false);
    setTimeout(() => setMensaje(''), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">💰 Precios de Servicios</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Los cambios se guardan en PostgreSQL vía n8n
          </p>
        </div>
        <button
          onClick={guardar}
          disabled={guardando}
          className="px-5 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {guardando ? 'Guardando...' : '💾 Guardar cambios'}
        </button>
      </div>

      {mensaje && (
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium">
          {mensaje}
        </div>
      )}

      <div className="space-y-3">
        {servicios.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap gap-4 items-center p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
          >
            <div className="flex-1 min-w-40">
              <label className="text-xs text-slate-400 block mb-1">Servicio</label>
              <input
                value={s.nombre}
                onChange={(e) => actualizar(s.id, 'nombre', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium"
              />
            </div>
            <div className="w-32">
              <label className="text-xs text-slate-400 block mb-1">Duración (min)</label>
              <input
                type="number"
                value={s.duracion_minutos}
                onChange={(e) => actualizar(s.id, 'duracion_minutos', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
              />
            </div>
            <div className="w-36">
              <label className="text-xs text-slate-400 block mb-1">Precio ($)</label>
              <input
                type="number"
                value={s.precio}
                onChange={(e) => actualizar(s.id, 'precio', parseInt(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="text-xs text-slate-400 mb-1">Activo</label>
              <button
                onClick={() => actualizar(s.id, 'activo', !s.activo)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  s.activo
                    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                }`}
              >
                {s.activo ? '✓ Sí' : '✗ No'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
