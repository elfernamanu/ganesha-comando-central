'use client';

import { useState, useEffect } from 'react';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface Jornada {
  id: string;
  fecha: string;        // '2025-07-18'
  hora_inicio: string;  // '08:00'
  hora_fin: string;     // '22:00'
  activa: boolean;
}

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
  jornadas: Jornada[];
  subservicios: SubServicio[];
}

// ── Datos iniciales ────────────────────────────────────────────────────────
const INICIAL: CategoriaServicio[] = [
  {
    id: 'unas', nombre: 'Uñas', icon: '💅', activo: true, jornadas: [],
    subservicios: [
      { id: 1,  nombre: 'Belleza de Manos (c/o sin Tradicional)', precio: 18000, activo: true },
      { id: 2,  nombre: 'Semipermanente',                          precio: 22000, activo: true },
      { id: 3,  nombre: 'Capping (Polygel)',                       precio: 25000, activo: true },
      { id: 4,  nombre: 'Esculpidas en Polygel',                   precio: 27000, activo: true },
      { id: 5,  nombre: 'Retiro Semipermanente',                   precio: 3500,  activo: true },
      { id: 6,  nombre: 'Retiro Capping',                          precio: 5000,  activo: true },
      { id: 7,  nombre: 'Belleza de Pies con Tradicional',         precio: 20000, activo: true },
      { id: 8,  nombre: 'Belleza de Pies con Semi',                precio: 22000, activo: true },
      { id: 9,  nombre: '🎁 PROMO: Semi + Belleza de Manos',       precio: 28000, activo: true },
      { id: 10, nombre: '🎁 PROMO: Capping + Belleza de Pies',     precio: 38000, activo: true },
      { id: 11, nombre: '🎁 PROMO: Semi Manos + Pies',             precio: 35000, activo: true },
    ],
  },
  {
    id: 'depilacion', nombre: 'Depilación', icon: '✨', activo: true, jornadas: [],
    subservicios: [
      // 🌸 MUJER
      { id: 1,  nombre: '🌸 Brazos',           precio: 20000, activo: true },
      { id: 2,  nombre: '🌸 Axilas',            precio: 18000, activo: true },
      { id: 3,  nombre: '🌸 Espalda baja',      precio: 16000, activo: true },
      { id: 4,  nombre: '🌸 Hombros',           precio: 16000, activo: true },
      { id: 5,  nombre: '🌸 Glúteos',           precio: 20000, activo: true },
      { id: 6,  nombre: '🌸 Tira de cola',      precio: 14000, activo: true },
      { id: 7,  nombre: '🌸 Rodillas',          precio: 14000, activo: true },
      { id: 8,  nombre: '🌸 Abdomen',           precio: 15000, activo: true },
      { id: 9,  nombre: '🌸 Bozo',              precio: 11000, activo: true },
      { id: 10, nombre: '🌸 Mentón',            precio: 11000, activo: true },
      { id: 11, nombre: '🌸 Patillas',          precio: 11000, activo: true },
      { id: 12, nombre: '🌸 Mejillas',          precio: 11000, activo: true },
      { id: 13, nombre: '🌸 Línea de alba',     precio: 11000, activo: true },
      { id: 14, nombre: '🌸 Dedos',             precio: 10000, activo: true },
      { id: 15, nombre: '🌸 Empeine',           precio: 10000, activo: true },
      // 💪 HOMBRE
      { id: 16, nombre: '💪 Brazos',            precio: 22000, activo: true },
      { id: 17, nombre: '💪 Pierna entera',     precio: 20000, activo: true },
      { id: 18, nombre: '💪 Media pierna',      precio: 15000, activo: true },
      { id: 19, nombre: '💪 Pelvis completa',   precio: 18000, activo: true },
      { id: 20, nombre: '💪 Pecho',             precio: 17000, activo: true },
      { id: 21, nombre: '💪 Abdomen',           precio: 17000, activo: true },
      { id: 22, nombre: '💪 Espalda completa',  precio: 22000, activo: true },
      { id: 23, nombre: '💪 Axilas',            precio: 18000, activo: true },
      { id: 24, nombre: '💪 Espalda baja',      precio: 16000, activo: true },
      { id: 25, nombre: '💪 Hombros',           precio: 16000, activo: true },
      { id: 26, nombre: '💪 Glúteos',           precio: 20000, activo: true },
      { id: 27, nombre: '💪 Tira de cola',      precio: 18000, activo: true },
      { id: 28, nombre: '💪 Rodillas',          precio: 14000, activo: true },
      { id: 29, nombre: '💪 Bozo',              precio: 12000, activo: true },
      { id: 30, nombre: '💪 Mentón',            precio: 13000, activo: true },
      { id: 31, nombre: '💪 Patillas',          precio: 13000, activo: true },
      { id: 32, nombre: '💪 Línea de alba',     precio: 14000, activo: true },
      { id: 33, nombre: '💪 Dedos',             precio: 11000, activo: true },
      { id: 34, nombre: '💪 Empeine',           precio: 12000, activo: true },
      // 🎁 PROMOS
      { id: 35, nombre: '🎁 PROMO 1: Rostro completo (Mujer)',     precio: 20500, activo: true },
      { id: 36, nombre: '🎁 PROMO 2: Cavado + Tira de cola',       precio: 22500, activo: true },
      { id: 37, nombre: '🎁 PROMO 3: Cuerpo completo sin rostro',  precio: 33000, activo: true },
      { id: 38, nombre: '🎁 PROMO 4: Pecho y Abdomen (Hombre)',    precio: 26500, activo: true },
      { id: 39, nombre: '🎁 PROMO 5: Pelvis y Tira (Hombre)',      precio: 27000, activo: true },
      { id: 40, nombre: '🎁 PROMO 6: Rostro completo (Hombre)',    precio: 24000, activo: true },
      { id: 41, nombre: '🎁 PROMO 7: Cuerpo completo (Hombre)',    precio: 41000, activo: true },
      { id: 42, nombre: '🎁 PROMO 8: Brazos y Axilas (Hombre)',    precio: 30000, activo: true },
    ],
  },
  {
    id: 'estetica', nombre: 'Estética', icon: '⚡', activo: true, jornadas: [],
    subservicios: [
      { id: 1, nombre: 'Estética Corporal',      precio: 20000, activo: true },
      { id: 2, nombre: 'Himfu / Criofrecuencia', precio: 0,     activo: true },
    ],
  },
  {
    id: 'pestanas', nombre: 'Pestañas', icon: '👁️', activo: true, jornadas: [],
    subservicios: [
      { id: 1, nombre: 'Extensiones Volumen', precio: 18000, activo: true },
      { id: 2, nombre: 'Lifting + Tinte',     precio: 0,     activo: true },
      { id: 3, nombre: 'Relleno',             precio: 0,     activo: true },
    ],
  },
];

const LS_KEY     = 'ganesha_config_servicios';
const LS_VERSION = 'ganesha_config_v3';      // Bump al cambiar INICIAL

// ── Helpers ────────────────────────────────────────────────────────────────
function formatFechaLabel(f: string): string {
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatPrecio(n: number): string {
  return n === 0 ? '' : n.toLocaleString('es-AR');
}

// ── Gestor de jornadas ─────────────────────────────────────────────────────
function JornadasPanel({
  catNombre,
  catIcon,
  jornadas,
  onChange,
}: {
  catNombre: string;
  catIcon: string;
  jornadas: Jornada[];
  onChange: (j: Jornada[]) => void;
}) {
  const [nuevaFecha,  setNuevaFecha]  = useState('');
  const [nuevaInicio, setNuevaInicio] = useState('08:00');
  const [nuevaFin,    setNuevaFin]    = useState('20:00');

  const agregar = () => {
    if (!nuevaFecha) return;
    const nueva: Jornada = {
      id: `jornada_${Date.now()}`,
      fecha: nuevaFecha,
      hora_inicio: nuevaInicio,
      hora_fin: nuevaFin,
      activa: true,
    };
    onChange([...jornadas, nueva].sort((a, b) => a.fecha.localeCompare(b.fecha)));
    setNuevaFecha('');
  };

  const toggleActiva = (id: string) =>
    onChange(jornadas.map(j => j.id === id ? { ...j, activa: !j.activa } : j));

  const eliminar = (id: string) =>
    onChange(jornadas.filter(j => j.id !== id));

  const actualizarHora = (id: string, campo: 'hora_inicio' | 'hora_fin', valor: string) =>
    onChange(jornadas.map(j => j.id === id ? { ...j, [campo]: valor } : j));

  const jornadasActivas   = jornadas.filter(j => j.activa).length;
  const jornadasInactivas = jornadas.filter(j => !j.activa).length;

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {jornadas.length > 0 && (
        <div className="flex gap-3 text-xs">
          <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
            ✓ {jornadasActivas} activa{jornadasActivas !== 1 ? 's' : ''}
          </span>
          {jornadasInactivas > 0 && (
            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">
              {jornadasInactivas} inactiva{jornadasInactivas !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Form agregar jornada */}
      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 space-y-2">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          + Nueva jornada de {catIcon} {catNombre}
        </p>
        {/* Fila 1: fecha */}
        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Fecha</label>
          <input
            type="date"
            value={nuevaFecha}
            onChange={e => setNuevaFecha(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm"
          />
        </div>
        {/* Fila 2: horarios + botón */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 block mb-1">Desde</label>
            <input
              type="time"
              value={nuevaInicio}
              onChange={e => setNuevaInicio(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm font-mono"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 block mb-1">Hasta</label>
            <input
              type="time"
              value={nuevaFin}
              onChange={e => setNuevaFin(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm font-mono"
            />
          </div>
          <button
            onClick={agregar}
            disabled={!nuevaFecha}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            + Agregar
          </button>
        </div>
      </div>

      {/* Lista de jornadas */}
      {jornadas.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-3">
          Sin jornadas cargadas — la agenda y el bot dirán "consultar disponibilidad"
        </p>
      ) : (
        <div className="space-y-2">
          {jornadas.map(j => (
            <div
              key={j.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-xl border transition-colors ${
                j.activa
                  ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-800'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
              }`}
            >
              {/* Fecha label */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold capitalize ${j.activa ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                  🗓️ {formatFechaLabel(j.fecha)}
                </p>
                <div className="flex gap-2 items-center mt-1">
                  <input
                    type="time"
                    value={j.hora_inicio}
                    onChange={e => actualizarHora(j.id, 'hora_inicio', e.target.value)}
                    className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-mono w-20"
                  />
                  <span className="text-xs text-slate-400">a</span>
                  <input
                    type="time"
                    value={j.hora_fin}
                    onChange={e => actualizarHora(j.id, 'hora_fin', e.target.value)}
                    className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-mono w-20"
                  />
                  <span className="text-xs text-slate-400">hs</span>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => toggleActiva(j.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    j.activa
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-green-100 hover:text-green-700'
                  }`}
                >
                  {j.activa ? '✓ Activa' : 'Activar'}
                </button>
                <button
                  onClick={() => eliminar(j.id)}
                  className="px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-colors font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lista de precios compacta ──────────────────────────────────────────────
function ListaPrecios({
  catId,
  subservicios,
  onActualizar,
  onAgregar,
  onEliminar,
}: {
  catId: string;
  subservicios: SubServicio[];
  onActualizar: (catId: string, id: number, campo: keyof SubServicio, valor: string | number | boolean) => void;
  onAgregar: (catId: string) => void;
  onEliminar: (catId: string, id: number) => void;
}) {
  const [mostrar, setMostrar] = useState(true);

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => setMostrar(m => !m)}
          className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide"
        >
          <span>{mostrar ? '▾' : '▸'}</span>
          💰 Servicios y precios ({subservicios.length})
        </button>
        <button
          onClick={() => onAgregar(catId)}
          className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 transition-colors"
        >
          + Agregar
        </button>
      </div>

      {mostrar && (
        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
          <div className="min-w-[420px]">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_72px_28px] gap-x-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700/50 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
            <span>Nombre</span>
            <span className="text-right">Precio</span>
            <span className="text-center">Estado</span>
            <span></span>
          </div>
          {subservicios.map((s, idx) => (
            <div
              key={s.id}
              className={`grid grid-cols-[1fr_100px_72px_28px] gap-x-2 items-center px-3 py-2 ${
                idx % 2 === 0
                  ? 'bg-white dark:bg-slate-800'
                  : 'bg-slate-50/50 dark:bg-slate-700/30'
              } border-t border-slate-100 dark:border-slate-700/50`}
            >
              <input
                value={s.nombre}
                onFocus={e => e.target.select()}
                onChange={e => onActualizar(catId, s.id, 'nombre', e.target.value)}
                className="w-full px-1.5 py-1 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-600 bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:border-slate-300 text-xs font-medium transition-colors"
              />
              <div className="flex items-center gap-0.5 justify-end">
                <span className="text-[10px] text-slate-400">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatPrecio(s.precio)}
                  onFocus={e => e.target.select()}
                  onChange={e => {
                    const num = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                    onActualizar(catId, s.id, 'precio', num);
                  }}
                  placeholder="—"
                  className="w-20 px-1.5 py-1 rounded border border-transparent hover:border-slate-200 dark:hover:border-slate-600 bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:border-slate-300 text-xs text-right font-mono transition-colors"
                />
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => onActualizar(catId, s.id, 'activo', !s.activo)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    s.activo
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  {s.activo ? '✓' : '✗'}
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => onEliminar(catId, s.id)}
                  className="w-6 h-6 flex items-center justify-center text-red-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          </div>{/* end min-w */}
        </div>
      )}
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function ConfiguracionServiciosPage() {
  const [categorias, setCategorias] = useState<CategoriaServicio[]>(INICIAL);
  const [tabActiva, setTabActiva]   = useState('unas');
  const [guardando, setGuardando]   = useState(false);
  const [mensaje, setMensaje]       = useState('');

  useEffect(() => {
    try {
      // Si la versión del localStorage es diferente a la actual,
      // los datos son viejos → limpiar y arrancar con INICIAL fresco.
      const version = localStorage.getItem(LS_VERSION);
      if (version !== 'ok') {
        localStorage.removeItem(LS_KEY);
        localStorage.setItem(LS_VERSION, 'ok');
        return; // usa INICIAL (valor por defecto del useState)
      }

      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CategoriaServicio[];
        // Migración suave: asegurar que cada categoría tiene jornadas (array)
        const migradas = parsed.map(c => ({
          ...c,
          jornadas: c.jornadas ?? [],
        }));
        setCategorias(migradas);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(categorias));
      localStorage.setItem(LS_VERSION, 'ok');
    } catch {}
  }, [categorias]);

  const actualizarJornadas = (catId: string, jornadas: Jornada[]) =>
    setCategorias(prev => prev.map(c => c.id === catId ? { ...c, jornadas } : c));

  const actualizarSub = (catId: string, subId: number, campo: keyof SubServicio, valor: string | number | boolean) =>
    setCategorias(prev => prev.map(c =>
      c.id === catId ? { ...c, subservicios: c.subservicios.map(s => s.id === subId ? { ...s, [campo]: valor } : s) } : c
    ));

  const agregarSub = (catId: string) =>
    setCategorias(prev => prev.map(c =>
      c.id === catId ? {
        ...c,
        subservicios: [...c.subservicios, {
          id: Math.max(0, ...c.subservicios.map(s => s.id)) + 1,
          nombre: 'Nuevo servicio', precio: 0, activo: true,
        }],
      } : c
    ));

  const eliminarSub = (catId: string, subId: number) =>
    setCategorias(prev => prev.map(c =>
      c.id === catId ? { ...c, subservicios: c.subservicios.filter(s => s.id !== subId) } : c
    ));

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'actualizar_servicios', categorias }),
      });
      setMensaje(res.ok ? '✅ Guardado en servidor' : '✅ Guardado localmente');
    } catch {
      setMensaje('✅ Guardado localmente');
    }
    setGuardando(false);
    setTimeout(() => setMensaje(''), 4000);
  };

  const cat = categorias.find(c => c.id === tabActiva)!;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">⚙️ Configuración de Servicios</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Jornadas · Precios · El bot y la agenda leen esto automáticamente
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

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {categorias.map(c => {
          const activas = c.jornadas.filter(j => j.activa).length;
          return (
            <button
              key={c.id}
              onClick={() => setTabActiva(c.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                tabActiva === c.id
                  ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {c.icon} {c.nombre}
              {activas > 0 && (
                <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                  {activas}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {cat && (
        <div className="space-y-5">
          {/* Jornadas */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3">
              📅 Jornadas de {cat.icon} {cat.nombre}
            </h3>
            <JornadasPanel
              catNombre={cat.nombre}
              catIcon={cat.icon}
              jornadas={cat.jornadas}
              onChange={j => actualizarJornadas(cat.id, j)}
            />
          </div>

          {/* Precios — colapsable */}
          <ListaPrecios
            catId={cat.id}
            subservicios={cat.subservicios}
            onActualizar={actualizarSub}
            onAgregar={agregarSub}
            onEliminar={eliminarSub}
          />
        </div>
      )}
    </div>
  );
}
