'use client';

import { useState } from 'react';

interface Servicio {
  id: number;
  nombre: string;
  categoria: 'femenina' | 'masculina';
  precio: number;
  activo: boolean;
}

const INICIAL: Servicio[] = [
  // FEMENINA
  { id: 1, nombre: 'Rostro Completo', categoria: 'femenina', precio: 20500, activo: true },
  { id: 2, nombre: 'Cavado + Tira de Cola', categoria: 'femenina', precio: 22500, activo: true },
  { id: 3, nombre: 'Axilas | Pierna Entera | Cavado | Tira de Cola | Bozo', categoria: 'femenina', precio: 24000, activo: true },
  { id: 4, nombre: 'Cuerpo Completo (No incluye Rostro)', categoria: 'femenina', precio: 33000, activo: true },
  // MASCULINA
  { id: 5, nombre: 'Rostro Completo', categoria: 'masculina', precio: 24000, activo: true },
  { id: 6, nombre: 'Pecho y Abdomen', categoria: 'masculina', precio: 26500, activo: true },
  { id: 7, nombre: 'Pelvis y Tira de Cola', categoria: 'masculina', precio: 27000, activo: true },
  { id: 8, nombre: 'Cuerpo Completo', categoria: 'masculina', precio: 41000, activo: true },
];

const ZONAS_INDIVIDUALES = [
  'Axilas',
  'Cavado (Normal o Completo)',
  'Piernas',
  'Espalda y Pecho (Hombres)',
];

const PROMOS = [
  'Cuerpo Completo',
  'Rostro Completo',
  'Cavado Completo + Tira de cola',
  'Cavado C. + Pierna E. + Axila + Bozo',
];

export default function DepilacionPage() {
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
        body: JSON.stringify({ accion: 'actualizar_precios_depilacion', servicios }),
      });
      setMensaje(res.ok ? '✅ Precios guardados correctamente' : '⚠️ Error al guardar — revisá n8n');
    } catch {
      setMensaje('⚠️ Sin conexión al servidor');
    }
    setGuardando(false);
    setTimeout(() => setMensaje(''), 3000);
  };

  const femenina = servicios.filter(s => s.categoria === 'femenina');
  const masculina = servicios.filter(s => s.categoria === 'masculina');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">✨ Depilación Definitiva</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Precios actuales · Zonas · Promos
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

      {/* FEMENINA */}
      <div>
        <h3 className="text-lg font-bold text-rose-500 mb-3">FEMENINA</h3>
        <div className="space-y-3">
          {femenina.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap gap-4 items-center p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
            >
              <div className="flex-1 min-w-48">
                <label className="text-xs text-slate-400 block mb-1">Servicio</label>
                <input
                  value={s.nombre}
                  onChange={(e) => actualizar(s.id, 'nombre', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium text-sm"
                />
              </div>
              <div className="w-36">
                <label className="text-xs text-slate-400 block mb-1">Precio ($)</label>
                <input
                  type="number"
                  value={s.precio}
                  onChange={(e) => actualizar(s.id, 'precio', parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium"
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

      {/* MASCULINA */}
      <div>
        <h3 className="text-lg font-bold text-blue-500 mb-3">MASCULINA</h3>
        <div className="space-y-3">
          {masculina.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap gap-4 items-center p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
            >
              <div className="flex-1 min-w-48">
                <label className="text-xs text-slate-400 block mb-1">Servicio</label>
                <input
                  value={s.nombre}
                  onChange={(e) => actualizar(s.id, 'nombre', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium text-sm"
                />
              </div>
              <div className="w-36">
                <label className="text-xs text-slate-400 block mb-1">Precio ($)</label>
                <input
                  type="number"
                  value={s.precio}
                  onChange={(e) => actualizar(s.id, 'precio', parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium"
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

      {/* Zonas y Promos (solo lectura por ahora) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Zonas Individuales */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-3">ZONAS INDIVIDUALES</h3>
          <ul className="space-y-2">
            {ZONAS_INDIVIDUALES.map((z) => (
              <li key={z} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0"></span>
                {z}
              </li>
            ))}
          </ul>
        </div>

        {/* Promos */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-3">PROMOS 🔥</h3>
          <ul className="space-y-2">
            {PROMOS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
