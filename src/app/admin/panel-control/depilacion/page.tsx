'use client';

import { useState } from 'react';
import { guardarPromosDepilacion } from '../_shared/catalogoPromos';

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
  categoria: 'femenina' | 'masculina' | 'ambas';
  activo: boolean;
}

const PRECIOS_INICIAL: Precio[] = [
  // ── MUJER — zonas individuales ─────────────────────────────────────────
  { id: 1,  nombre: 'Brazos',        categoria: 'femenina', precio: 20000, activo: true },
  { id: 2,  nombre: 'Axilas',        categoria: 'femenina', precio: 18000, activo: true },
  { id: 3,  nombre: 'Espalda baja',  categoria: 'femenina', precio: 16000, activo: true },
  { id: 4,  nombre: 'Hombros',       categoria: 'femenina', precio: 16000, activo: true },
  { id: 5,  nombre: 'Glúteos',       categoria: 'femenina', precio: 20000, activo: true },
  { id: 6,  nombre: 'Tira de cola',  categoria: 'femenina', precio: 14000, activo: true },
  { id: 7,  nombre: 'Rodillas',      categoria: 'femenina', precio: 14000, activo: true },
  { id: 8,  nombre: 'Abdomen',       categoria: 'femenina', precio: 15000, activo: true },
  { id: 9,  nombre: 'Bozo',          categoria: 'femenina', precio: 11000, activo: true },
  { id: 10, nombre: 'Mentón',        categoria: 'femenina', precio: 11000, activo: true },
  { id: 11, nombre: 'Patillas',      categoria: 'femenina', precio: 11000, activo: true },
  { id: 12, nombre: 'Mejillas',      categoria: 'femenina', precio: 11000, activo: true },
  { id: 13, nombre: 'Línea de alba', categoria: 'femenina', precio: 11000, activo: true },
  { id: 14, nombre: 'Dedos',         categoria: 'femenina', precio: 10000, activo: true },
  { id: 15, nombre: 'Empeine',       categoria: 'femenina', precio: 10000, activo: true },
  // ── HOMBRE — zonas individuales ────────────────────────────────────────
  { id: 16, nombre: 'Brazos',           categoria: 'masculina', precio: 22000, activo: true },
  { id: 17, nombre: 'Pierna entera',    categoria: 'masculina', precio: 20000, activo: true },
  { id: 18, nombre: 'Media pierna',     categoria: 'masculina', precio: 15000, activo: true },
  { id: 19, nombre: 'Pelvis completa',  categoria: 'masculina', precio: 18000, activo: true },
  { id: 20, nombre: 'Pecho',            categoria: 'masculina', precio: 17000, activo: true },
  { id: 21, nombre: 'Abdomen',          categoria: 'masculina', precio: 17000, activo: true },
  { id: 22, nombre: 'Espalda completa', categoria: 'masculina', precio: 22000, activo: true },
  { id: 23, nombre: 'Axilas',           categoria: 'masculina', precio: 18000, activo: true },
  { id: 24, nombre: 'Espalda baja',     categoria: 'masculina', precio: 16000, activo: true },
  { id: 25, nombre: 'Hombros',          categoria: 'masculina', precio: 16000, activo: true },
  { id: 26, nombre: 'Glúteos',          categoria: 'masculina', precio: 20000, activo: true },
  { id: 27, nombre: 'Tira de cola',     categoria: 'masculina', precio: 18000, activo: true },
  { id: 28, nombre: 'Rodillas',         categoria: 'masculina', precio: 14000, activo: true },
  { id: 29, nombre: 'Bozo',             categoria: 'masculina', precio: 12000, activo: true },
  { id: 30, nombre: 'Mentón',           categoria: 'masculina', precio: 13000, activo: true },
  { id: 31, nombre: 'Patillas',         categoria: 'masculina', precio: 13000, activo: true },
  { id: 32, nombre: 'Línea de alba',    categoria: 'masculina', precio: 14000, activo: true },
  { id: 33, nombre: 'Dedos',            categoria: 'masculina', precio: 11000, activo: true },
  { id: 34, nombre: 'Empeine',          categoria: 'masculina', precio: 12000, activo: true },
];

const PROMOS_INICIAL: Promo[] = [
  // ── MUJER ──────────────────────────────────────────────────────────────
  { numero: 1, nombre: 'Depilacion PROMO 1', descripcion: 'Rostro completo',            precio: 20500, categoria: 'femenina',  activo: true },
  { numero: 2, nombre: 'Depilacion PROMO 2', descripcion: 'Cavado + Tira de cola',      precio: 22500, categoria: 'femenina',  activo: true },
  { numero: 3, nombre: 'Depilacion PROMO 3', descripcion: 'Cuerpo completo sin rostro', precio: 33000, categoria: 'femenina',  activo: true },
  // ── HOMBRE ─────────────────────────────────────────────────────────────
  { numero: 4, nombre: 'Depilacion PROMO 4', descripcion: 'Pecho y Abdomen',            precio: 26500, categoria: 'masculina', activo: true },
  { numero: 5, nombre: 'Depilacion PROMO 5', descripcion: 'Pelvis y Tira de cola',      precio: 27000, categoria: 'masculina', activo: true },
  { numero: 6, nombre: 'Depilacion PROMO 6', descripcion: 'Rostro completo',            precio: 24000, categoria: 'masculina', activo: true },
  { numero: 7, nombre: 'Depilacion PROMO 7', descripcion: 'Cuerpo completo',            precio: 41000, categoria: 'masculina', activo: true },
  { numero: 8, nombre: 'Depilacion PROMO 8', descripcion: 'Brazos y Axilas',            precio: 30000, categoria: 'masculina', activo: true },
];

type Tab = 'promos' | 'femenina' | 'masculina';

// Input de precio que no muestra 0, selecciona todo al hacer foco
function PrecioInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [display, setDisplay] = useState(value === 0 ? '' : value.toString());

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, '');
        setDisplay(raw);
        onChange(raw === '' ? 0 : parseInt(raw));
      }}
      onBlur={() => setDisplay(value === 0 ? '' : value.toString())}
      placeholder="0"
      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium"
    />
  );
}

// Botones Femenina / Masculina / Ambas
function CategoriaToggle({
  value,
  onChange,
}: {
  value: 'femenina' | 'masculina' | 'ambas';
  onChange: (v: 'femenina' | 'masculina' | 'ambas') => void;
}) {
  const opts: { key: 'femenina' | 'masculina' | 'ambas'; label: string; color: string; active: string }[] = [
    { key: 'femenina', label: '🌸 Fem', color: 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300', active: 'bg-rose-500 text-white border-rose-500' },
    { key: 'masculina', label: '💪 Masc', color: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300', active: 'bg-blue-500 text-white border-blue-500' },
    { key: 'ambas', label: '👥 Ambas', color: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300', active: 'bg-purple-500 text-white border-purple-500' },
  ];
  return (
    <div className="flex gap-2">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors ${value === o.key ? o.active : o.color}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function DepilacionPage() {
  const [precios, setPrecios] = useState<Precio[]>(PRECIOS_INICIAL);
  const [promos, setPromos] = useState<Promo[]>(PROMOS_INICIAL);
  const [tab, setTab] = useState<Tab>('promos');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const actualizarPrecio = (id: number, campo: keyof Precio, valor: string | number | boolean) =>
    setPrecios(prev => prev.map(p => p.id === id ? { ...p, [campo]: valor } : p));

  const eliminarPrecio = (id: number) =>
    setPrecios(prev => prev.filter(p => p.id !== id));

  const agregarPrecio = (categoria: 'femenina' | 'masculina') => {
    const nuevoId = precios.length > 0 ? Math.max(...precios.map(p => p.id)) + 1 : 1;
    setPrecios(prev => [...prev, { id: nuevoId, nombre: 'Nuevo servicio', categoria, precio: 0, activo: true }]);
  };

  const actualizarPromo = (numero: number, campo: keyof Promo, valor: string | number | boolean) =>
    setPromos(prev => prev.map(p => p.numero === numero ? { ...p, [campo]: valor } : p));

  const eliminarPromo = (numero: number) =>
    setPromos(prev => prev.filter(p => p.numero !== numero));

  const agregarPromo = () => {
    const nuevoNumero = promos.length > 0 ? Math.max(...promos.map(p => p.numero)) + 1 : 1;
    setPromos(prev => [...prev, { numero: nuevoNumero, nombre: `Depilacion PROMO ${nuevoNumero}`, descripcion: '', precio: 0, categoria: 'ambas', activo: true }]);
  };

  const guardar = async () => {
    setGuardando(true);
    // Sincronizar catálogo en localStorage para que Turnos lo lea al auto-completar
    guardarPromosDepilacion(promos);
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'actualizar_depilacion', precios, promos }),
      });
      setMensaje(res.ok ? '✅ Guardado — el bot ya conoce las promos' : '⚠️ Error — revisá n8n');
    } catch {
      setMensaje('⚠️ Sin conexión');
    }
    setGuardando(false);
    setTimeout(() => setMensaje(''), 4000);
  };

  const femenina = precios.filter(p => p.categoria === 'femenina');
  const masculina = precios.filter(p => p.categoria === 'masculina');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">✨ Depilación Definitiva</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Lo que edites acá el bot de Telegram lo lee automáticamente
          </p>
        </div>
        <button onClick={guardar} disabled={guardando} className="px-5 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {guardando ? 'Guardando...' : '💾 Guardar todo'}
        </button>
      </div>

      {mensaje && <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium">{mensaje}</div>}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['promos', 'femenina', 'masculina'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${tab === t ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            {t === 'promos' ? '🔥 Promos' : t === 'femenina' ? '🌸 Femenina' : '💪 Masculina'}
          </button>
        ))}
      </div>

      {/* PROMOS */}
      {tab === 'promos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Mandá <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">depilacion PROMO 1</span> por Telegram → el bot sabe qué es y para quién
            </p>
            <button onClick={agregarPromo} className="px-4 py-2 rounded-lg text-sm font-bold bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 hover:bg-orange-200 transition-colors">
              + Nueva
            </button>
          </div>
          <div className="space-y-3">
            {promos.map((promo) => (
              <div key={promo.numero} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 font-bold text-sm">
                    Depilacion PROMO {promo.numero}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => actualizarPromo(promo.numero, 'activo', !promo.activo)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${promo.activo ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                      {promo.activo ? '✓ Activa' : '✗ Inactiva'}
                    </button>
                    <button onClick={() => eliminarPromo(promo.numero)} className="px-3 py-1 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Categoría — el bot lee esto directamente */}
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Para quién es esta promo (el bot lo usa)</label>
                  <CategoriaToggle
                    value={promo.categoria}
                    onChange={(v) => actualizarPromo(promo.numero, 'categoria', v)}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nombre</label>
                  <input value={promo.nombre} onFocus={(e) => e.target.select()} onChange={(e) => actualizarPromo(promo.numero, 'nombre', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Qué incluye</label>
                  <input value={promo.descripcion} onFocus={(e) => e.target.select()} onChange={(e) => actualizarPromo(promo.numero, 'descripcion', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm" placeholder="Ej: Cavado + Pierna entera + Axilas" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Precio ($)</label>
                  <PrecioInput value={promo.precio} onChange={(v) => actualizarPromo(promo.numero, 'precio', v)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FEMENINA */}
      {tab === 'femenina' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-rose-500">Precios Femenina</h3>
            <button onClick={() => agregarPrecio('femenina')} className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 hover:bg-rose-200 transition-colors">
              + Nueva
            </button>
          </div>
          <div className="space-y-3">
            {femenina.map((s) => (
              <div key={s.id} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Servicio</label>
                  <input value={s.nombre} onFocus={(e) => e.target.select()} onChange={(e) => actualizarPrecio(s.id, 'nombre', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium text-sm" />
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Precio ($)</label>
                    <PrecioInput value={s.precio} onChange={(v) => actualizarPrecio(s.id, 'precio', v)} />
                  </div>
                  <button onClick={() => actualizarPrecio(s.id, 'activo', !s.activo)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${s.activo ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                    {s.activo ? '✓' : '✗'}
                  </button>
                  <button onClick={() => eliminarPrecio(s.id)} className="px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MASCULINA */}
      {tab === 'masculina' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-blue-500">Precios Masculina</h3>
            <button onClick={() => agregarPrecio('masculina')} className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 transition-colors">
              + Nueva
            </button>
          </div>
          <div className="space-y-3">
            {masculina.map((s) => (
              <div key={s.id} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Servicio</label>
                  <input value={s.nombre} onFocus={(e) => e.target.select()} onChange={(e) => actualizarPrecio(s.id, 'nombre', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-medium text-sm" />
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1">Precio ($)</label>
                    <PrecioInput value={s.precio} onChange={(v) => actualizarPrecio(s.id, 'precio', v)} />
                  </div>
                  <button onClick={() => actualizarPrecio(s.id, 'activo', !s.activo)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${s.activo ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                    {s.activo ? '✓' : '✗'}
                  </button>
                  <button onClick={() => eliminarPrecio(s.id)} className="px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
