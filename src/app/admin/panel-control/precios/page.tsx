'use client';

import { useState, useEffect } from 'react';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface SubServicio {
  id: number;
  nombre: string;
  precio: number;
  activo: boolean;
}

interface CategoriaServicio {
  id: string;
  nombre: string;
  icon: string;
  activo: boolean;
  dias_mes: number[];        // ej: [3, 7, 14, 21] → días del mes que se ofrece
  subservicios: SubServicio[];
}

// ── Datos iniciales ────────────────────────────────────────────────────────
const INICIAL: CategoriaServicio[] = [
  {
    id: 'unas',
    nombre: 'Uñas',
    icon: '💅',
    activo: true,
    dias_mes: [],
    subservicios: [
      // — Manos —
      { id: 1,  nombre: 'Belleza de Manos (c/o sin Tradicional)', precio: 18000, activo: true },
      { id: 2,  nombre: 'Semipermanente',                          precio: 22000, activo: true },
      { id: 3,  nombre: 'Capping (Polygel)',                       precio: 25000, activo: true },
      { id: 4,  nombre: 'Esculpidas en Polygel',                   precio: 27000, activo: true },
      { id: 5,  nombre: 'Retiro Semipermanente',                   precio: 3500,  activo: true },
      { id: 6,  nombre: 'Retiro Capping',                          precio: 5000,  activo: true },
      // — Pies —
      { id: 7,  nombre: 'Belleza de Pies con Tradicional',         precio: 20000, activo: true },
      { id: 8,  nombre: 'Belleza de Pies con Semi',                precio: 22000, activo: true },
      // — Promos —
      { id: 9,  nombre: '🎁 PROMO: Semi + Belleza de Manos',       precio: 28000, activo: true },
      { id: 10, nombre: '🎁 PROMO: Capping + Belleza de Pies',     precio: 38000, activo: true },
      { id: 11, nombre: '🎁 PROMO: Semi Manos + Pies',             precio: 35000, activo: true },
    ],
  },
  {
    id: 'depilacion',
    nombre: 'Depilación',
    icon: '✨',
    activo: true,
    dias_mes: [],
    subservicios: [
      { id: 1, nombre: 'Sesión individual (ver tab Depilación para zonas)', precio: 0, activo: true },
    ],
  },
  {
    id: 'estetica',
    nombre: 'Estética',
    icon: '⚡',
    activo: true,
    dias_mes: [],
    subservicios: [
      { id: 1, nombre: 'Estética Corporal',     precio: 20000, activo: true },
      { id: 2, nombre: 'Himfu / Criofrecuencia', precio: 0,     activo: true },
    ],
  },
  {
    id: 'pestanas',
    nombre: 'Pestañas',
    icon: '👁️',
    activo: true,
    dias_mes: [],
    subservicios: [
      { id: 1, nombre: 'Extensiones Volumen',   precio: 18000, activo: true },
      { id: 2, nombre: 'Lifting + Tinte',        precio: 0,     activo: true },
      { id: 3, nombre: 'Relleno',               precio: 0,     activo: true },
    ],
  },
];

const LS_KEY = 'ganesha_config_servicios';

// ── Selector de días del mes ───────────────────────────────────────────────
function DiasMesPicker({
  dias,
  onChange,
}: {
  dias: number[];
  onChange: (d: number[]) => void;
}) {
  const toggle = (d: number) =>
    onChange(
      dias.includes(d)
        ? dias.filter(x => x !== d)
        : [...dias, d].sort((a, b) => a - b)
    );

  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
        Tocá los días del mes en que se ofrece este servicio:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
          <button
            key={d}
            onClick={() => toggle(d)}
            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
              dias.includes(d)
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      {dias.length > 0 ? (
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
          📅 Días activos este mes: {dias.join(', ')}
        </p>
      ) : (
        <p className="text-xs text-slate-400 mt-2 italic">
          Sin días configurados — el bot dirá "consultar disponibilidad"
        </p>
      )}
    </div>
  );
}

// ── Input de precio con formato ────────────────────────────────────────────
function PrecioInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value === 0 ? '' : value.toLocaleString('es-AR')}
      onFocus={e => e.target.select()}
      onChange={e => {
        const num = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
        onChange(num);
      }}
      placeholder="0"
      className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-right font-mono"
    />
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function ConfiguracionServiciosPage() {
  const [categorias, setCategorias] = useState<CategoriaServicio[]>(INICIAL);
  const [tabActiva, setTabActiva] = useState('unas');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Cargar desde localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) setCategorias(JSON.parse(stored));
    } catch {}
  }, []);

  // Auto-guardar en localStorage cada vez que cambian los datos
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(categorias));
    } catch {}
  }, [categorias]);

  const cat = categorias.find(c => c.id === tabActiva)!;

  // Actualizar un sub-servicio
  const actualizarSub = (
    catId: string,
    subId: number,
    campo: keyof SubServicio,
    valor: string | number | boolean
  ) =>
    setCategorias(prev =>
      prev.map(c =>
        c.id === catId
          ? { ...c, subservicios: c.subservicios.map(s => (s.id === subId ? { ...s, [campo]: valor } : s)) }
          : c
      )
    );

  // Agregar sub-servicio
  const agregarSub = (catId: string) =>
    setCategorias(prev =>
      prev.map(c =>
        c.id === catId
          ? {
              ...c,
              subservicios: [
                ...c.subservicios,
                { id: Math.max(0, ...c.subservicios.map(s => s.id)) + 1, nombre: 'Nuevo servicio', precio: 0, activo: true },
              ],
            }
          : c
      )
    );

  // Eliminar sub-servicio
  const eliminarSub = (catId: string, subId: number) =>
    setCategorias(prev =>
      prev.map(c =>
        c.id === catId ? { ...c, subservicios: c.subservicios.filter(s => s.id !== subId) } : c
      )
    );

  // Actualizar días del mes
  const actualizarDias = (catId: string, dias: number[]) =>
    setCategorias(prev => prev.map(c => (c.id === catId ? { ...c, dias_mes: dias } : c)));

  // Guardar — localStorage ya tiene los datos, este botón también manda al servidor
  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'actualizar_servicios', categorias }),
      });
      setMensaje(res.ok ? '✅ Configuración guardada en servidor' : '✅ Guardado local — sin conexión al servidor');
    } catch {
      setMensaje('✅ Guardado localmente');
    }
    setGuardando(false);
    setTimeout(() => setMensaje(''), 4000);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">⚙️ Configuración de Servicios</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Precios · Días disponibles · El bot lee esto automáticamente
          </p>
        </div>
        <button
          onClick={guardar}
          disabled={guardando}
          className="px-5 py-2 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {guardando ? 'Guardando...' : '💾 Guardar todo'}
        </button>
      </div>

      {mensaje && (
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium">{mensaje}</div>
      )}

      {/* Tabs de categoría */}
      <div className="flex gap-2 flex-wrap">
        {categorias.map(c => (
          <button
            key={c.id}
            onClick={() => setTabActiva(c.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              tabActiva === c.id
                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {c.icon} {c.nombre}
          </button>
        ))}
      </div>

      {/* Contenido de la categoría activa */}
      {cat && (
        <div className="space-y-5">

          {/* Selector de días del mes */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3">
              📅 ¿Qué días del mes se ofrece {cat.icon} {cat.nombre}?
            </h3>
            <DiasMesPicker dias={cat.dias_mes} onChange={dias => actualizarDias(cat.id, dias)} />
          </div>

          {/* Lista de servicios y precios */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                💰 Servicios y precios
              </h3>
              <button
                onClick={() => agregarSub(cat.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-colors"
              >
                + Agregar
              </button>
            </div>

            <div className="space-y-2">
              {cat.subservicios.map(s => (
                <div
                  key={s.id}
                  className="flex flex-col gap-1.5 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
                >
                  {/* Fila 1: Nombre */}
                  <input
                    value={s.nombre}
                    onFocus={e => e.target.select()}
                    onChange={e => actualizarSub(cat.id, s.id, 'nombre', e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm font-medium"
                  />

                  {/* Fila 2: Precio + controles */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">$</span>
                    <PrecioInput value={s.precio} onChange={v => actualizarSub(cat.id, s.id, 'precio', v)} />

                    <div className="ml-auto flex gap-1.5">
                      {/* Activo */}
                      <button
                        onClick={() => actualizarSub(cat.id, s.id, 'activo', !s.activo)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          s.activo
                            ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                        }`}
                      >
                        {s.activo ? '✓ Activo' : '✗ Inactivo'}
                      </button>

                      {/* Eliminar */}
                      <button
                        onClick={() => eliminarSub(cat.id, s.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
