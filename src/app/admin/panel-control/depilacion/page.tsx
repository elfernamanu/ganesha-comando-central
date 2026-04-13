'use client';

import { useState, useRef } from 'react';

interface Precio {
  id: number;
  nombre: string;
  categoria: 'femenina' | 'masculina';
  precio: number;
  activo: boolean;
}

interface Promo {
  numero: number;
  nombre: string;
  descripcion: string;
  precio: number;
  activo: boolean;
}

const PRECIOS_INICIAL: Precio[] = [
  { id: 1, nombre: 'Rostro Completo', categoria: 'femenina', precio: 20500, activo: true },
  { id: 2, nombre: 'Cavado + Tira de Cola', categoria: 'femenina', precio: 22500, activo: true },
  { id: 3, nombre: 'Axilas | Pierna Entera | Cavado | Tira de Cola | Bozo', categoria: 'femenina', precio: 24000, activo: true },
  { id: 4, nombre: 'Cuerpo Completo (No incluye Rostro)', categoria: 'femenina', precio: 33000, activo: true },
  { id: 5, nombre: 'Rostro Completo', categoria: 'masculina', precio: 24000, activo: true },
  { id: 6, nombre: 'Pecho y Abdomen', categoria: 'masculina', precio: 26500, activo: true },
  { id: 7, nombre: 'Pelvis y Tira de Cola', categoria: 'masculina', precio: 27000, activo: true },
  { id: 8, nombre: 'Cuerpo Completo', categoria: 'masculina', precio: 41000, activo: true },
];

const PROMOS_INICIAL: Promo[] = [
  { numero: 1, nombre: 'Promo Cuerpo Completo', descripcion: 'Cuerpo Completo sin rostro', precio: 33000, activo: true },
  { numero: 2, nombre: 'Promo Rostro Completo', descripcion: 'Rostro completo femenino', precio: 20500, activo: true },
  { numero: 3, nombre: 'Promo Cavado + Cola', descripcion: 'Cavado Completo + Tira de cola', precio: 22500, activo: true },
  { numero: 4, nombre: 'Promo Combo Full', descripcion: 'Cavado C. + Pierna E. + Axila + Bozo', precio: 24000, activo: true },
];

export default function DepilacionPage() {
  const [precios, setPrecios] = useState<Precio[]>(PRECIOS_INICIAL);
  const [promos, setPromos] = useState<Promo[]>(PROMOS_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [seccion, setSeccion] = useState<'promos' | 'femenina' | 'masculina'>('promos');
  const nuevaPromoRef = useRef<HTMLDivElement>(null);

  const actualizarPrecio = (id: number, campo: keyof Precio, valor: string | number | boolean) => {
    setPrecios(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));
  };

  const actualizarPromo = (numero: number, campo: keyof Promo, valor: string | number | boolean) => {
    setPromos(prev => prev.map(p => p.numero === numero ? { ...p, [campo]: valor } : p));
  };

  const agregarPromo = () => {
    const nuevoNumero = promos.length > 0 ? Math.max(...promos.map(p => p.numero)) + 1 : 1;
    setPromos(prev => [...prev, {
      numero: nuevoNumero,
      nombre: `Promo ${nuevoNumero}`,
      descripcion: '',
      precio: 0,
      activo: true,
    }]);
    setTimeout(() => {
      nuevaPromoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const eliminarPromo = (numero: number) => {
    setPromos(prev => prev.filter(p => p.numero !== numero));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'actualizar_depilacion', precios, promos }),
      });
      setMensaje(res.ok ? '✅ Guardado — el bot ya conoce las promos' : '⚠️ Error al guardar — revisá n8n');
    } catch {
      setMensaje('⚠️ Sin conexión al servidor');
    }
    setGuardando(false);
    setTimeout(() => setMensaje(''), 4000);
  };

  const femenina = precios.filter(p => p.categoria === 'femenina');
  const masculina = precios.filter(p => p.categoria === 'masculina');

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">✨ Depilación Definitiva</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Lo que edites acá el bot de Telegram lo lee automáticamente
          </p>
        </div>
        <button
          onClick={guardar}
          disabled={guardando}
          className="px-5 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors w-full sm:w-auto"
        >
          {guardando ? 'Guardando...' : '💾 Guardar todo'}
        </button>
      </div>

      {mensaje && (
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium">
          {mensaje}
        </div>
      )}

      {/* Tabs de sección */}
      <div className="flex gap-2 flex-wrap">
        {(['promos', 'femenina', 'masculina'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSeccion(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors capitalize ${
              seccion === tab
                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {tab === 'promos' ? '🔥 Promos' : tab === 'femenina' ? 'Femenina' : 'Masculina'}
          </button>
        ))}
      </div>

      {/* PROMOS */}
      {seccion === 'promos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mandá <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">promo 1</span> por Telegram → el bot sabe qué es
            </p>
            <button
              onClick={agregarPromo}
              className="px-4 py-2 rounded-lg text-sm font-bold bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 hover:bg-orange-200 transition-colors whitespace-nowrap"
            >
              + Nueva
            </button>
          </div>

          <div className="space-y-3">
            {promos.map((promo, idx) => (
              <div
                key={promo.numero}
                ref={idx === promos.length - 1 ? nuevaPromoRef : null}
                className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3"
              >
                {/* Número + toggle + eliminar */}
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 font-bold text-sm">
                    Promo {promo.numero}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => actualizarPromo(promo.numero, 'activo', !promo.activo)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        promo.activo
                          ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {promo.activo ? '✓ Activa' : '✗ Inactiva'}
                    </button>
                    <button
                      onClick={() => eliminarPromo(promo.numero)}
                      className="px-3 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Nombre */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nombre</label>
                  <input
                    value={promo.nombre}
                    onChange={(e) => actualizarPromo(promo.numero, 'nombre', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium text-sm"
                    placeholder="Ej: Promo Verano"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Qué incluye</label>
                  <input
                    value={promo.descripcion}
                    onChange={(e) => actualizarPromo(promo.numero, 'descripcion', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
                    placeholder="Ej: Cavado + Pierna entera + Axilas"
                  />
                </div>

                {/* Precio */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Precio ($)</label>
                  <input
                    type="number"
                    value={promo.precio}
                    onChange={(e) => actualizarPromo(promo.numero, 'precio', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FEMENINA */}
      {seccion === 'femenina' && (
        <div className="space-y-3">
          <h3 className="font-bold text-rose-500">FEMENINA — Precios</h3>
          {femenina.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3"
            >
              <div>
                <label className="text-xs text-slate-400 block mb-1">Servicio</label>
                <input
                  value={s.nombre}
                  onChange={(e) => actualizarPrecio(s.id, 'nombre', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium text-sm"
                />
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-1">Precio ($)</label>
                  <input
                    type="number"
                    value={s.precio}
                    onChange={(e) => actualizarPrecio(s.id, 'precio', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium"
                  />
                </div>
                <button
                  onClick={() => actualizarPrecio(s.id, 'activo', !s.activo)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    s.activo
                      ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  {s.activo ? '✓ Activo' : '✗ No'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MASCULINA */}
      {seccion === 'masculina' && (
        <div className="space-y-3">
          <h3 className="font-bold text-blue-500">MASCULINA — Precios</h3>
          {masculina.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3"
            >
              <div>
                <label className="text-xs text-slate-400 block mb-1">Servicio</label>
                <input
                  value={s.nombre}
                  onChange={(e) => actualizarPrecio(s.id, 'nombre', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium text-sm"
                />
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 block mb-1">Precio ($)</label>
                  <input
                    type="number"
                    value={s.precio}
                    onChange={(e) => actualizarPrecio(s.id, 'precio', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium"
                  />
                </div>
                <button
                  onClick={() => actualizarPrecio(s.id, 'activo', !s.activo)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    s.activo
                      ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  {s.activo ? '✓ Activo' : '✗ No'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
