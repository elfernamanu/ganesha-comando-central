'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Subservicio {
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
  jornadas: { id: string; fecha: string; hora_inicio: string; hora_fin: string; activa: boolean }[];
  fechas_activas?: string[];  // legacy
  dias_mes?: number[];        // legacy
  subservicios: Subservicio[];
}

interface TurnoSecretaria {
  id: string;
  horario: string;
  clienteNombre: string;
  tratamiento: string;
  detalle: string;
  asistencia: 'presente' | 'no_vino';
  monto_total: number;
  seña_pagada: number;
  estado_pago: 'sin_pago' | 'seña' | 'completo';
  metodo_pago: 'efectivo' | 'transferencia' | 'otro';
  createdAt: number;
}

interface DiaCalendario {
  fecha: Date;
  esMesActual: boolean;
  esDiaHoy: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const SERVICIOS_DEFAULT: CategoriaServicio[] = [
  { id: 'unas',       nombre: 'Uñas',       icon: '💅', activo: true, jornadas: [], subservicios: [] },
  { id: 'depilacion', nombre: 'Depilación', icon: '✨', activo: true, jornadas: [], subservicios: [] },
  { id: 'estetica',   nombre: 'Estética',   icon: '⚡', activo: true, jornadas: [], subservicios: [] },
  { id: 'pestanas',   nombre: 'Pestañas',   icon: '👁️', activo: true, jornadas: [], subservicios: [] },
];

const COLORES_SERVICIO: Record<string, { chip: string; dot: string }> = {
  unas:       { chip: 'bg-rose-100 text-rose-700',   dot: 'bg-rose-400'   },
  depilacion: { chip: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400'  },
  estetica:   { chip: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400' },
  pestanas:   { chip: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-400'   },
};

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DIAS_ES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function padTwo(n: number): string {
  return n.toString().padStart(2, '0');
}

function fechaKey(fecha: Date): string {
  return `${fecha.getFullYear()}-${padTwo(fecha.getMonth() + 1)}-${padTwo(fecha.getDate())}`;
}

function etiquetaDia(fecha: Date): string {
  const diaSemana = DIAS_ES[fecha.getDay()];
  const diaMes    = fecha.getDate();
  const mes       = MESES_ES[fecha.getMonth()];
  return `${diaSemana} ${diaMes} de ${mes}`;
}

/**
 * Construye un array de semanas (7 días cada una) para el mes dado.
 * Semana comienza el lunes (ISO). Si el 1 del mes cae en domingo → índice 6.
 */
function construirGrid(anio: number, mes: number): DiaCalendario[][] {
  const hoy    = new Date();
  const hoyKey = fechaKey(hoy);

  const primerDia = new Date(anio, mes, 1);
  // getDay() → 0=Dom, 1=Lun … convertir a 0=Lun … 6=Dom
  let offsetLunes = primerDia.getDay() - 1;
  if (offsetLunes < 0) offsetLunes = 6;

  const ultimoDia     = new Date(anio, mes + 1, 0).getDate();
  const totalCeldas   = Math.ceil((offsetLunes + ultimoDia) / 7) * 7;

  const semanas: DiaCalendario[][] = [];
  let semanaActual: DiaCalendario[] = [];

  for (let i = 0; i < totalCeldas; i++) {
    const fechaCelda = new Date(anio, mes, 1 - offsetLunes + i);
    const esActual   = fechaCelda.getMonth() === mes;
    const diaKey     = fechaKey(fechaCelda);

    semanaActual.push({
      fecha: fechaCelda,
      esMesActual: esActual,
      esDiaHoy:    diaKey === hoyKey,
    });

    if (semanaActual.length === 7) {
      semanas.push(semanaActual);
      semanaActual = [];
    }
  }

  return semanas;
}

function etiquetaPago(estado: TurnoSecretaria['estado_pago']): string {
  switch (estado) {
    case 'sin_pago': return 'Sin pago';
    case 'seña':     return 'Seña';
    case 'completo': return 'Completo';
  }
}

function colorPago(estado: TurnoSecretaria['estado_pago']): string {
  switch (estado) {
    case 'sin_pago': return 'bg-red-100 text-red-700';
    case 'seña':     return 'bg-yellow-100 text-yellow-700';
    case 'completo': return 'bg-green-100 text-green-700';
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AgendaMensual() {
  const hoy   = new Date();
  const [anio, setAnio]    = useState<number>(hoy.getFullYear());
  const [mes,  setMes]     = useState<number>(hoy.getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(hoy);

  const [servicios, setServicios] = useState<CategoriaServicio[]>(SERVICIOS_DEFAULT);
  const [turnos,    setTurnos]    = useState<TurnoSecretaria[]>([]);

  // ── Leer config de servicios ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ganesha_config_servicios');
      if (raw) {
        const parsed = JSON.parse(raw) as CategoriaServicio[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setServicios(parsed);
        }
      }
    } catch {
      // si falla el parse, usar defaults
    }
  }, []);

  // ── Leer turnos del día seleccionado ─────────────────────────────────────
  useEffect(() => {
    if (!diaSeleccionado) {
      setTurnos([]);
      return;
    }
    try {
      const key = `ganesha_turnos_${fechaKey(diaSeleccionado)}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as TurnoSecretaria[];
        if (Array.isArray(parsed)) {
          const ordenados = [...parsed].sort((a, b) =>
            a.horario.localeCompare(b.horario)
          );
          setTurnos(ordenados);
          return;
        }
      }
    } catch {
      // silencioso
    }
    setTurnos([]);
  }, [diaSeleccionado]);

  // ── Navegación de meses ───────────────────────────────────────────────────
  const irMesAnterior = useCallback(() => {
    if (mes === 0) { setMes(11); setAnio(a => a - 1); }
    else           { setMes(m => m - 1); }
    setDiaSeleccionado(null);
  }, [mes]);

  const irMesSiguiente = useCallback(() => {
    if (mes === 11) { setMes(0); setAnio(a => a + 1); }
    else            { setMes(m => m + 1); }
    setDiaSeleccionado(null);
  }, [mes]);

  const seleccionarDia = useCallback((dia: DiaCalendario) => {
    if (!dia.esMesActual) return;
    setDiaSeleccionado(prev => {
      if (prev && fechaKey(prev) === fechaKey(dia.fecha)) return null;
      return dia.fecha;
    });
  }, []);

  // ── Servicios con jornada activa para una fecha concreta ─────────────────
  const serviciosPorDia = useCallback((fecha: Date): CategoriaServicio[] => {
    const key = fechaKey(fecha);
    return servicios.filter(s =>
      s.activo && (s.jornadas ?? []).some(j => j.activa && j.fecha === key)
    );
  }, [servicios]);

  // ── Contar turnos guardados por día (desde localStorage) ─────────────────
  const contarTurnosDia = useCallback((fecha: Date): number => {
    try {
      const raw = localStorage.getItem(`ganesha_turnos_${fechaKey(fecha)}`);
      if (!raw) return 0;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, []);

  const grid = construirGrid(anio, mes);

  const keySeleccionado = diaSeleccionado ? fechaKey(diaSeleccionado) : null;

  // ── Servicios del día seleccionado ────────────────────────────────────────
  const serviciosDiaSeleccionado = diaSeleccionado
    ? serviciosPorDia(diaSeleccionado)
    : [];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto select-none">

      {/* ── Encabezado del mes ── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={irMesAnterior}
          aria-label="Mes anterior"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-lg font-bold"
        >
          ‹
        </button>

        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-wide">
          {MESES_ES[mes]} {anio}
        </h2>

        <button
          onClick={irMesSiguiente}
          aria-label="Mes siguiente"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-lg font-bold"
        >
          ›
        </button>
      </div>

      {/* ── Nombres de días ── */}
      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map((d, i) => (
          <div
            key={i}
            className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Grid del mes ── */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {grid.map((semana, si) => (
          <div
            key={si}
            className={`grid grid-cols-7 ${si < grid.length - 1 ? 'border-b border-slate-200 dark:border-slate-700' : ''}`}
          >
            {semana.map((dia, di) => {
              const esSel     = keySeleccionado === fechaKey(dia.fecha);
              const srvsDia   = dia.esMesActual ? serviciosPorDia(dia.fecha) : [];
              const numTurnos = dia.esMesActual ? contarTurnosDia(dia.fecha) : 0;
              const tieneServicio = srvsDia.length > 0;

              return (
                <button
                  key={di}
                  onClick={() => seleccionarDia(dia)}
                  disabled={!dia.esMesActual}
                  className={[
                    'relative flex flex-col items-start justify-start p-1 sm:p-1.5 min-h-[56px] sm:min-h-[72px] text-left transition-all',
                    di < 6 ? 'border-r border-slate-200 dark:border-slate-700' : '',
                    // Días fuera del mes → muy tenues, no clickeables
                    !dia.esMesActual
                      ? 'bg-slate-50/50 dark:bg-slate-900/30 cursor-default'
                      // Día seleccionado
                      : esSel
                        ? 'bg-blue-50 dark:bg-blue-950/50 cursor-pointer'
                        // Día con servicio → fondo levemente cálido, se destaca
                        : tieneServicio
                          ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer'
                          // Sin servicio → fondo tenue para que "desaparezca"
                          : 'bg-slate-50/60 dark:bg-slate-900/20 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 cursor-pointer',
                  ].join(' ')}
                >
                  {/* Número del día */}
                  <span
                    className={[
                      'text-xs leading-none mb-1 w-5 h-5 flex items-center justify-center rounded-full shrink-0',
                      !dia.esMesActual
                        ? 'text-slate-300 dark:text-slate-700 text-[10px]'
                        : dia.esDiaHoy
                          ? 'bg-blue-600 text-white font-bold'
                          : esSel
                            ? 'text-blue-700 dark:text-blue-300 font-bold'
                            : tieneServicio
                              ? 'text-slate-800 dark:text-slate-100 font-bold'
                              : 'text-slate-400 dark:text-slate-600 font-normal',
                    ].join(' ')}
                  >
                    {dia.fecha.getDate()}
                  </span>

                  {/* Chips de servicios — solo si hay jornadas activas */}
                  {tieneServicio && (
                    <div className="flex flex-col gap-0.5 w-full">
                      {srvsDia.map(srv => {
                        const col = COLORES_SERVICIO[srv.id] ?? { chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
                        return (
                          <span
                            key={srv.id}
                            className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold leading-tight whitespace-nowrap w-full truncate ${col.chip}`}
                          >
                            <span className="shrink-0">{srv.icon}</span>
                            <span className="hidden sm:inline truncate">{srv.nombre}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Badge de turnos cargados */}
                  {numTurnos > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                      {numTurnos}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Panel detalle del día seleccionado ── */}
      {diaSeleccionado && (
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">

          {/* Encabezado del panel */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">
                {etiquetaDia(diaSeleccionado)}
              </p>
              {serviciosDiaSeleccionado.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                  {serviciosDiaSeleccionado.map(srv => {
                    const col = COLORES_SERVICIO[srv.id] ?? { chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
                    const jornada = (srv.jornadas ?? []).find(j => j.activa && diaSeleccionado && j.fecha === fechaKey(diaSeleccionado));
                    return (
                      <span
                        key={srv.id}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${col.chip}`}
                      >
                        {srv.icon} {srv.nombre}
                        {jornada && <span className="opacity-60 font-normal">{jornada.hora_inicio}–{jornada.hora_fin}</span>}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  Sin servicios configurados para este día
                </p>
              )}
            </div>

            <Link
              href={`/admin/panel-control/turnos?fecha=${fechaKey(diaSeleccionado)}`}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap ml-2"
            >
              Ver turnos →
            </Link>
          </div>

          {/* Lista de turnos */}
          {turnos.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">Sin turnos para este día</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {turnos.map(turno => (
                <li
                  key={turno.id}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  {/* Hora */}
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 w-10 shrink-0 pt-0.5">
                    {turno.horario}
                  </span>

                  {/* Datos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {turno.clienteNombre}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {turno.tratamiento}
                      {turno.detalle ? ` — ${turno.detalle}` : ''}
                    </p>
                  </div>

                  {/* Estado de pago */}
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${colorPago(turno.estado_pago)}`}
                  >
                    {etiquetaPago(turno.estado_pago)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
