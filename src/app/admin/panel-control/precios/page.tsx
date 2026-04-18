'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { invalidarCatalogoCache } from '../_shared/catalogoPromos';
import CargandoServidor from '@/components/CargandoServidor';

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
      { id: 9,  nombre: 'PROMO UÑAS 1: Semi + Belleza de Manos',   precio: 28000, activo: true },
      { id: 10, nombre: 'PROMO UÑAS 2: Capping + Belleza de Pies', precio: 38000, activo: true },
      { id: 11, nombre: 'PROMO UÑAS 3: Semi Manos + Pies',         precio: 35000, activo: true },
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
      // PROMOS MUJER
      { id: 35, nombre: 'PROMO DEPI 1: Rostro completo (Mujer)',           precio: 20500, activo: true },
      { id: 36, nombre: 'PROMO DEPI 2: Cavado + Tira de cola (Mujer)',     precio: 22500, activo: true },
      { id: 37, nombre: 'PROMO DEPI 3: Cuerpo completo (Mujer)',           precio: 33000, activo: true },
      // PROMOS HOMBRE
      { id: 38, nombre: 'PROMO DEPI 4: Pecho y Abdomen (Hombre)',          precio: 26500, activo: true },
      { id: 39, nombre: 'PROMO DEPI 5: Pelvis y Tira (Hombre)',            precio: 27000, activo: true },
      { id: 40, nombre: 'PROMO DEPI 6: Rostro completo (Hombre)',          precio: 24000, activo: true },
      { id: 41, nombre: 'PROMO DEPI 7: Cuerpo completo (Hombre)',          precio: 41000, activo: true },
      { id: 42, nombre: 'PROMO DEPI 8: Brazos y Axilas (Hombre)',          precio: 30000, activo: true },
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
const LS_VERSION = 'ganesha_config_v5';      // v5: promos renombrados + emojis limpios

// ── Helpers ────────────────────────────────────────────────────────────────
function formatFechaLabel(f: string): string {
  const d = new Date(f + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());
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

  const hoy = new Date().toISOString().split('T')[0];

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

  // Limpia automáticamente las fechas que ya pasaron
  const limpiarPasadas = () =>
    onChange(jornadas.filter(j => j.fecha >= hoy));

  const jornadasActivas   = jornadas.filter(j => j.activa).length;
  const jornadasInactivas = jornadas.filter(j => !j.activa).length;
  const jornadasPasadas   = jornadas.filter(j => j.fecha < hoy).length;

  return (
    <div className="space-y-2">
      {/* Resumen + botón limpiar pasadas */}
      {jornadas.length > 0 && (
        <div className="flex gap-2 text-xs items-center flex-wrap">
          <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium">
            ✓ {jornadasActivas} activa{jornadasActivas !== 1 ? 's' : ''}
          </span>
          {jornadasInactivas > 0 && (
            <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">
              {jornadasInactivas} inactiva{jornadasInactivas !== 1 ? 's' : ''}
            </span>
          )}
          {jornadasPasadas > 0 && (
            <button onClick={limpiarPasadas}
              className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold hover:bg-red-200 transition-colors">
              🗑 Limpiar {jornadasPasadas} pasada{jornadasPasadas !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* Form agregar jornada — una sola línea */}
      <div className="flex flex-wrap gap-1.5 items-center px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide shrink-0">+ Jornada</span>
        <input
          type="date"
          value={nuevaFecha}
          onChange={e => setNuevaFecha(e.target.value)}
          className="w-36 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs"
        />
        <input type="text" inputMode="numeric" placeholder="08:00" maxLength={5}
          value={nuevaInicio} onChange={e => setNuevaInicio(e.target.value)}
          className="w-16 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-mono" />
        <span className="text-[9px] text-slate-400">→</span>
        <input type="text" inputMode="numeric" placeholder="20:00" maxLength={5}
          value={nuevaFin} onChange={e => setNuevaFin(e.target.value)}
          className="w-16 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-mono" />
        <button onClick={agregar} disabled={!nuevaFecha}
          className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0">
          + Agregar
        </button>
      </div>

      {/* Lista de jornadas */}
      {jornadas.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-3">
          Sin jornadas cargadas — la agenda y el bot dirán "consultar disponibilidad"
        </p>
      ) : (
        <div className="space-y-1">
          {jornadas.map(j => {
            const esPasada = j.fecha < hoy;
            return (
            <div
              key={j.id}
              className={`flex flex-col sm:flex-row sm:items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                esPasada
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 opacity-70'
                  : j.activa
                  ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-800'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60'
              }`}
            >
              {/* Fecha label */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold capitalize ${esPasada ? 'text-red-500 dark:text-red-400' : j.activa ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                  {esPasada ? '⚠️' : '🗓️'} {formatFechaLabel(j.fecha)}{esPasada ? ' — ya pasó' : ''}
                </p>
                <div className="flex gap-1.5 items-center mt-0.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="09:00"
                    maxLength={5}
                    value={j.hora_inicio}
                    onChange={e => actualizarHora(j.id, 'hora_inicio', e.target.value)}
                    className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-xs font-mono w-20"
                  />
                  <span className="text-xs text-slate-400">a</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="19:00"
                    maxLength={5}
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
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Celda de subservicio — estado LOCAL para que tipear sea instantáneo ──
const FilaSubServicio = React.memo(function FilaSubServicio({
  s,
  catId,
  promoNumero,
  onActualizar,
  onEliminar,
}: {
  s: SubServicio;
  catId: string;
  promoNumero?: number; // número auto-asignado si es promo
  onActualizar: (catId: string, id: number, campo: keyof SubServicio, valor: string | number | boolean) => void;
  onEliminar: (catId: string, id: number) => void;
}) {
  const esPromo = s.nombre.startsWith('PROMO') || s.nombre.startsWith('🎁');
  const esPromoHombre = esPromo && s.nombre.includes('(Hombre)');

  // Separar código y descripción: "PROMO DEPI 1: Rostro completo" → ["PROMO DEPI 1", "Rostro completo"]
  const colonIdx = s.nombre.indexOf(':');
  const codigoPromoOriginal = colonIdx > -1 ? s.nombre.slice(0, colonIdx).trim() : s.nombre;
  const descPromoOriginal   = colonIdx > -1 ? s.nombre.slice(colonIdx + 1).trim() : '';

  // Si tenemos número auto-asignado, reconstruir el prefijo con él
  // "PROMO DEPI 3: ..." con promoNumero=2 → mostramos "PROMO DEPI 2"
  // Reemplaza el último número en el código original si lo hay, o lo agrega
  // Siempre quitar el número viejo y poner el auto-asignado
  const codigoBase    = esPromoHombre ? 'PROMO H DEP' : codigoPromoOriginal.replace(/\s*\d+$/, '').trim();
  const codigoDisplay = promoNumero != null ? `${codigoBase} ${promoNumero}` : codigoPromoOriginal;

  const [precio, setPrecio] = React.useState(formatPrecio(s.precio));
  const [desc, setDesc]     = React.useState(descPromoOriginal);
  const [nombre, setNombre] = React.useState(s.nombre);

  // Sincronizar si el padre cambia (ej: nueva carga desde localStorage)
  React.useEffect(() => {
    const ci = s.nombre.indexOf(':');
    setDesc(ci > -1 ? s.nombre.slice(ci + 1).trim() : '');
    setNombre(s.nombre);
  }, [s.nombre]);
  React.useEffect(() => { setPrecio(formatPrecio(s.precio)); }, [s.precio]);

  // Cuando el usuario termina de editar la descripción, reconstruir el nombre completo
  // usando el código tal como está almacenado (el número real del stored nombre)
  const handleDescBlur = () => {
    // Usar codigoDisplay (con número auto-asignado) para que el número se grabe correctamente
    const nombreCompleto = desc.trim()
      ? `${codigoDisplay}: ${desc.trim()}`
      : codigoDisplay;
    onActualizar(catId, s.id, 'nombre', nombreCompleto);
  };

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 group ${esPromoHombre ? 'bg-blue-50 dark:bg-blue-900/20' : esPromo ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-white dark:bg-slate-800'}`}>
      {esPromo ? (
        <div className="flex-1 min-w-0 flex items-center gap-1 py-0.5">
          {/* Código fijo (número auto-asignado) */}
          <span className={`text-[10px] font-extrabold leading-tight shrink-0 select-none ${esPromoHombre ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>
            {codigoDisplay}:
          </span>
          {/* Descripción editable */}
          <input
            value={desc}
            title={s.nombre}
            onFocus={e => e.target.select()}
            onChange={e => setDesc(e.target.value)}
            onBlur={handleDescBlur}
            placeholder="descripción"
            className={`flex-1 min-w-0 text-[10px] bg-transparent outline-none rounded px-0.5 truncate ${esPromoHombre ? 'text-blue-600 dark:text-blue-500 focus:bg-blue-100 dark:focus:bg-slate-700' : 'text-amber-600 dark:text-amber-500 focus:bg-amber-100 dark:focus:bg-slate-700'}`}
          />
        </div>
      ) : (
        <input
          value={nombre}
          title={nombre}
          onFocus={e => e.target.select()}
          onChange={e => setNombre(e.target.value)}
          onBlur={() => onActualizar(catId, s.id, 'nombre', nombre)}
          className="flex-1 min-w-0 text-[11px] font-semibold bg-transparent outline-none focus:bg-slate-100 dark:focus:bg-slate-700 rounded px-0.5 truncate"
        />
      )}
      <span className="text-[9px] text-slate-400 shrink-0">$</span>
      <input
        type="text" inputMode="numeric"
        value={precio}
        onFocus={e => { setPrecio(s.precio === 0 ? '' : String(s.precio)); e.target.select(); }}
        onChange={e => setPrecio(e.target.value.replace(/\D/g, ''))}
        onBlur={() => {
          const n = parseInt(precio.replace(/\D/g, ''), 10) || 0;
          onActualizar(catId, s.id, 'precio', n);
          setPrecio(formatPrecio(n));
        }}
        placeholder="—"
        className={`w-14 text-[11px] text-right font-mono bg-transparent outline-none rounded px-0.5 shrink-0 ${esPromoHombre ? 'text-blue-700 dark:text-blue-400 font-bold focus:bg-blue-100 dark:focus:bg-slate-700' : esPromo ? 'text-amber-700 dark:text-amber-400 font-bold focus:bg-amber-100 dark:focus:bg-slate-700' : ''}`}
      />
      <button
        onClick={() => onEliminar(catId, s.id)}
        className="shrink-0 w-4 h-4 flex items-center justify-center text-red-200 hover:text-red-500 rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
      >✕</button>
    </div>
  );
});

// ── Cabecera de sección dentro de la tabla ────────────────────────────────
function SeccionHeader({ label }: { label: string }) {
  return (
    <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600">
      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide">
        {label}
      </span>
    </div>
  );
}

// ── Lista de precios compacta ──────────────────────────────────────────────
function ListaPrecios({
  catId,
  subservicios,
  onActualizar,
  onAgregar,
  onAgregarConPrefijo,
  onEliminar,
}: {
  catId: string;
  subservicios: SubServicio[];
  onActualizar: (catId: string, id: number, campo: keyof SubServicio, valor: string | number | boolean) => void;
  onAgregar: (catId: string) => void;
  onAgregarConPrefijo: (catId: string, prefijo: string) => void;
  onEliminar: (catId: string, id: number) => void;
}) {
  const [mostrar, setMostrar] = useState(true);

  const esDepilacion = catId === 'depilacion';
  const esUnas       = catId === 'unas';

  // Helper: detecta promos por prefijo PROMO o emoji 🎁
  const esPromoNombre = (nombre: string) => nombre.startsWith('PROMO') || nombre.startsWith('🎁');

  // Grupos para depilación — 4 secciones: Zonas Mujer | Zonas Hombre | Promos Mujer | Promos Hombre
  const todosPromos = subservicios.filter(s => esPromoNombre(s.nombre));
  const grupos = esDepilacion
    ? [
        { label: '🌸 ZONAS MUJER',   prefijo: '🌸',                  items: subservicios.filter(s => s.nombre.startsWith('🌸')) },
        { label: '💪 ZONAS HOMBRE',  prefijo: '💪',                  items: subservicios.filter(s => s.nombre.startsWith('💪')) },
        { label: '🌸 PROMOS MUJER',  prefijo: 'PROMO DEPI: (Mujer)', items: todosPromos.filter(s => !s.nombre.includes('Hombre')) },
        { label: '💪 PROMOS HOMBRE', prefijo: 'PROMO DEPI: (Hombre)',items: todosPromos.filter(s =>  s.nombre.includes('Hombre')) },
      ].filter(g => g.items.length > 0)
    : null;

  // Grupos para uñas y demás: servicios + promos en 2 columnas
  const promoPrefijoPorCat: Record<string, string> = {
    unas: 'PROMO UÑAS', estetica: 'PROMO EST', pestanas: 'PROMO PEST',
  };
  const gruposUnas = !esDepilacion ? [
    { label: 'SERVICIOS', prefijo: '',      items: subservicios.filter(s => !esPromoNombre(s.nombre)) },
    { label: 'PROMOS',    prefijo: promoPrefijoPorCat[catId] ?? 'PROMO', items: subservicios.filter(s => esPromoNombre(s.nombre)) },
  ].filter(g => g.items.length > 0) : null;

  return (
    <div>
      <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
        <button
            onClick={() => setMostrar(m => !m)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide"
          >
            <span>{mostrar ? '▾' : '▸'}</span>
            💰 Servicios y precios ({subservicios.length})
          </button>

        {/* Botones de agregar — distintos según la categoría */}
        {esDepilacion ? (
          <div className="flex gap-1 flex-wrap">
            <button onClick={() => onAgregarConPrefijo(catId, '🌸')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-100 dark:bg-pink-900/40 text-pink-700 hover:bg-pink-200 transition-colors">
              + Zona Mujer
            </button>
            <button onClick={() => onAgregarConPrefijo(catId, '💪')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 hover:bg-blue-200 transition-colors">
              + Zona Hombre
            </button>
            <button onClick={() => onAgregarConPrefijo(catId, 'PROMO DEPI: (Mujer)')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-50 dark:bg-pink-900/20 text-amber-700 border border-pink-300 hover:bg-pink-100 transition-colors">
              + Promo Mujer
            </button>
            <button onClick={() => onAgregarConPrefijo(catId, 'PROMO DEPI: (Hombre)')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-amber-700 border border-blue-300 hover:bg-blue-100 transition-colors">
              + Promo Hombre
            </button>
          </div>
        ) : (
          <div className="flex gap-1">
            <button onClick={() => onAgregar(catId)}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 hover:bg-emerald-200 transition-colors">
              + Servicio
            </button>
            <button onClick={() => onAgregarConPrefijo(catId, promoPrefijoPorCat[catId] ?? 'PROMO')}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 hover:bg-amber-200 transition-colors">
              + Promo
            </button>
          </div>
        )}
      </div>

      {mostrar && (
        <div className="rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden overflow-x-auto">
          {/* ── Con grupos: 3 columnas paralelas ── */}
          {(esDepilacion && grupos) || (!esDepilacion && gruposUnas) ? (
            <div className={`grid divide-x divide-slate-100 dark:divide-slate-700 min-w-0 ${
              (esDepilacion ? grupos! : gruposUnas!).length === 4
                ? 'grid-cols-4'
                : (esDepilacion ? grupos! : gruposUnas!).length === 3
                ? 'grid-cols-3'
                : (esDepilacion ? grupos! : gruposUnas!).length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-1'
            }`}>
              {(esDepilacion ? grupos! : gruposUnas!).filter(g => g.items.length > 0).map(grupo => (
                <div key={grupo.label} className="flex flex-col">
                  {/* Header de columna */}
                  <div className="flex items-center justify-between px-2 py-1 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600 sticky top-0">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wide truncate">
                      {grupo.label}
                    </span>
                    <button
                      onClick={() => grupo.prefijo ? onAgregarConPrefijo(catId, grupo.prefijo) : onAgregar(catId)}
                      className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 px-1 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors shrink-0 ml-1"
                    >+ Agregar</button>
                  </div>
                  {/* Items de esta columna — lista vertical */}
                  <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {grupo.items.map((s, idx) => {
                      const esPromoGrupo = s.nombre.startsWith('PROMO') || s.nombre.startsWith('🎁');
                      return (
                        <FilaSubServicio key={s.id} s={s} catId={catId}
                          promoNumero={esPromoGrupo ? idx + 1 : undefined}
                          onActualizar={onActualizar} onEliminar={onEliminar} />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── Sin grupos: grilla 3 columnas de ítems ── */
            <div className="grid grid-cols-3 gap-px bg-slate-100 dark:bg-slate-700">
              {subservicios.map((s) => (
                <FilaSubServicio key={s.id} s={s} catId={catId}
                  onActualizar={onActualizar} onEliminar={onEliminar} />
              ))}
            </div>
          )}
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
  const [cargado, setCargado]       = useState(false);
  const { mostrar } = useToast();

  useEffect(() => {
    // 1. Carga localStorage inmediatamente (rápido)
    try {
      if (localStorage.getItem(LS_VERSION) === 'ok') {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as CategoriaServicio[];
          setCategorias(parsed.map(c => ({ ...c, jornadas: c.jornadas ?? [] })));
        }
      }
    } catch {}

    // 2. Luego busca en el servidor (fuente de verdad)
    fetch('/api/admin/config')
      .then(r => r.json())
      .then(data => {
        // Solo usa datos del servidor si son válidos (al menos 3 categorías con servicios reales)
        const valido = data.ok &&
          Array.isArray(data.datos) &&
          data.datos.length >= 3 &&
          data.datos.every((c: CategoriaServicio) => c.id && Array.isArray(c.subservicios) && c.subservicios.length > 0);
        if (valido) {
          setCategorias(data.datos.map((c: CategoriaServicio) => ({ ...c, jornadas: c.jornadas ?? [] })));
        }
      })
      .catch(() => {})
      .finally(() => setCargado(true));
  }, []);

  // Guarda en localStorage — SOLO después de que cargó (no sobreescribe con INICIAL)
  useEffect(() => {
    if (!cargado) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(categorias));
      localStorage.setItem(LS_VERSION, 'ok');
      invalidarCatalogoCache(); // precio nuevo disponible de inmediato en turnos
    } catch {}
  }, [categorias, cargado]);

  const actualizarJornadas = (catId: string, jornadas: Jornada[]) =>
    setCategorias(prev => prev.map(c => c.id === catId ? { ...c, jornadas } : c));

  const actualizarSub = (catId: string, subId: number, campo: keyof SubServicio, valor: string | number | boolean) =>
    setCategorias(prev => prev.map(c =>
      c.id === catId ? { ...c, subservicios: c.subservicios.map(s => s.id === subId ? { ...s, [campo]: valor } : s) } : c
    ));

  // Agrega al TOPE de la lista general
  const agregarSub = (catId: string) =>
    setCategorias(prev => prev.map(c =>
      c.id === catId ? {
        ...c,
        subservicios: [{
          id: Math.max(0, ...c.subservicios.map(s => s.id)) + 1,
          nombre: 'Nuevo servicio', precio: 0, activo: true,
        }, ...c.subservicios],
      } : c
    ));

  // Agrega al TOPE del grupo correspondiente (por emoji prefijo: 🌸 💪 🎁)
  const agregarSubConPrefijo = (catId: string, prefijo: string) =>
    setCategorias(prev => prev.map(c => {
      if (c.id !== catId) return c;

      // Detectar si es una promo (prefijo con "PROMO")
      const esPrefijoPromo = prefijo.startsWith('PROMO');

      let nombreNuevo: string;
      if (esPrefijoPromo) {
        // Calcular próximo número: contar promos existentes del mismo grupo
        // Grupo Mujer: PROMO ... sin "Hombre"; Grupo Hombre: PROMO ... con "Hombre"
        const esGrupoHombre = prefijo.includes('Hombre');
        const promosDelGrupo = c.subservicios.filter(s =>
          (s.nombre.startsWith('PROMO') || s.nombre.startsWith('🎁')) &&
          (esGrupoHombre ? s.nombre.includes('Hombre') : !s.nombre.includes('Hombre'))
        );
        const siguienteNumero = promosDelGrupo.length + 1;
        // Detectar la raíz del código: "PROMO DEPI: (Mujer)" → "PROMO DEPI"
        // Quitar el sufijo de género para quedarnos con la raíz
        const raiz = prefijo.replace(/\s*[:(]\s*(Mujer|Hombre)\)?/gi, '').trim();
        // Incluir "(Hombre)" en el nombre para que catalogoPromos pueda clasificarlo
        const sufijogenero = esGrupoHombre ? ' (Hombre)' : '';
        nombreNuevo = `${raiz} ${siguienteNumero}: Nueva promo${sufijogenero}`;
      } else {
        nombreNuevo = `${prefijo} Nuevo`;
      }

      const nuevo: SubServicio = {
        id: Math.max(0, ...c.subservicios.map(s => s.id)) + 1,
        nombre: nombreNuevo,
        precio: 0,
        activo: true,
      };

      const subs = [...c.subservicios];
      // Para promos, agregar al FINAL del grupo (para que el número sea el último)
      if (esPrefijoPromo) {
        const esGrupoHombre = prefijo.includes('Hombre');
        // Encontrar el último ítem del grupo promo correspondiente
        let ultimoIdx = -1;
        subs.forEach((s, i) => {
          const esPromoS = s.nombre.startsWith('PROMO') || s.nombre.startsWith('🎁');
          if (esPromoS) {
            const esHombreS = s.nombre.includes('Hombre');
            if (esGrupoHombre === esHombreS) ultimoIdx = i;
          }
        });
        if (ultimoIdx >= 0) {
          subs.splice(ultimoIdx + 1, 0, nuevo); // después del último del grupo
        } else {
          subs.push(nuevo);
        }
      } else {
        const primerIdx = subs.findIndex(s => s.nombre.startsWith(prefijo));
        if (primerIdx >= 0) {
          subs.splice(primerIdx, 0, nuevo); // al tope del grupo
        } else {
          subs.unshift(nuevo);
        }
      }
      return { ...c, subservicios: subs };
    }));

  const eliminarSub = (catId: string, subId: number) =>
    setCategorias(prev => prev.map(c =>
      c.id === catId ? { ...c, subservicios: c.subservicios.filter(s => s.id !== subId) } : c
    ));

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: categorias }),
      });
      if (res.ok) {
        // Limpiar caché de fechas para que Turnos y Caja refresquen las jornadas al instante
        try { sessionStorage.removeItem('ganesha_fechas_cache'); } catch {}
        mostrar('Servicios guardados', 'exito', 'Los precios y jornadas llegaron al servidor ✓');
      } else {
        mostrar('Error al guardar', 'error', 'El servidor respondió con error, revisá la conexión');
      }
    } catch {
      mostrar('Sin conexión', 'error', 'No se pudo llegar al servidor');
    }
    setGuardando(false);
  };

  const cat = categorias.find(c => c.id === tabActiva)!;

  if (!cargado) return <CargandoServidor seccion="Servicios y Precios" />;

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold">⚙️ Configuración de Servicios</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
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

      {/* Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {categorias.map(c => {
          const activas = c.jornadas.filter(j => j.activa).length;
          return (
            <button
              key={c.id}
              onClick={() => setTabActiva(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
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
        <div className="space-y-3">
          {/* Jornadas */}
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">
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
            onAgregarConPrefijo={agregarSubConPrefijo}
            onEliminar={eliminarSub}
          />
        </div>
      )}
    </div>
  );
}
