'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';

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
  const cargarServicios = useCallback(() => {
    try {
      const raw = localStorage.getItem('ganesha_config_servicios');
      if (raw) {
        const parsed = JSON.parse(raw) as CategoriaServicio[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setServicios(parsed);
          return;
        }
      }
    } catch {
      // si falla el parse, usar defaults
    }
    setServicios(SERVICIOS_DEFAULT);
  }, []);

  useEffect(() => {
    cargarServicios();
    // Recargar cuando el usuario vuelve a esta pestaña
    // (por si la dueña configuró servicios en otra pestaña)
    const onFocus = () => cargarServicios();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [cargarServicios]);

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

  // ── Conteo de turnos por día — leemos TODO el localStorage UNA sola vez ────
  // (en vez de 30 lecturas individuales al renderizar)
  const turnosPorDia = useMemo<Record<string, number>>(() => {
    const mapa: Record<string, number> = {};
    const prefix = 'ganesha_turnos_';
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(prefix)) continue;
        const fecha = key.slice(prefix.length); // 'YYYY-MM-DD'
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        mapa[fecha] = Array.isArray(parsed) ? parsed.length : 0;
      }
    } catch { /* silencioso */ }
    return mapa;
  }, []);  // solo recalcula si cambia el mes/año (ver abajo)

  const contarTurnosDia = useCallback((fecha: Date): number => {
    return turnosPorDia[fechaKey(fecha)] ?? 0;
  }, [turnosPorDia]);

  const keySeleccionado = diaSeleccionado ? fechaKey(diaSeleccionado) : null;

  // ── Solo los días del mes que tienen servicio O turnos cargados ───────────
  const diasActivos = (() => {
    const ultimoDia = new Date(anio, mes + 1, 0).getDate();
    const resultado = [];
    for (let d = 1; d <= ultimoDia; d++) {
      const fecha = new Date(anio, mes, d);
      const srvs = serviciosPorDia(fecha);
      const nTurnos = contarTurnosDia(fecha);
      if (srvs.length > 0 || nTurnos > 0) {
        resultado.push({ fecha, srvs, nTurnos });
      }
    }
    return resultado;
  })();

  // ── Servicios del día seleccionado ────────────────────────────────────────
  const serviciosDiaSeleccionado = diaSeleccionado
    ? serviciosPorDia(diaSeleccionado)
    : [];

  const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto select-none">

      {/* ── Encabezado del mes ── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button onClick={irMesAnterior} aria-label="Mes anterior"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-lg font-bold">
          ‹
        </button>
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-wide">
          {MESES_ES[mes]} {anio}
        </h2>
        <button onClick={irMesSiguiente} aria-label="Mes siguiente"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-lg font-bold">
          ›
        </button>
      </div>

      {/* ── Solo días con servicios o turnos — fila horizontal scrolleable ── */}
      {diasActivos.length === 0 ? (
        <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-6 italic">
          Sin servicios cargados este mes
        </p>
      ) : (
        <div className="flex gap-2.5 overflow-x-auto pb-2 px-1 scrollbar-hide">
          {diasActivos.map(({ fecha, srvs, nTurnos }) => {
            const key   = fechaKey(fecha);
            const esSel = keySeleccionado === key;
            const esHoy = key === fechaKey(new Date());

            return (
              <button
                key={key}
                onClick={() => setDiaSeleccionado(prev =>
                  prev && fechaKey(prev) === key ? null : fecha
                )}
                className={[
                  'relative flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl transition-all shrink-0 min-w-[62px] active:scale-95',
                  esSel
                    ? 'bg-violet-600 shadow-lg shadow-violet-200 dark:shadow-violet-900/40'
                    : esHoy
                      ? 'bg-white dark:bg-slate-800 shadow-md shadow-slate-200/80 dark:shadow-slate-900/60 ring-2 ring-violet-400 ring-offset-1'
                      : 'bg-white dark:bg-slate-800 shadow-sm shadow-slate-200/60 dark:shadow-slate-900/40',
                ].join(' ')}
              >
                {/* Nombre día */}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${
                  esSel ? 'text-violet-200' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {DIAS_CORTOS[fecha.getDay()]}
                </span>

                {/* Número */}
                <span className={`text-xl font-black leading-none ${
                  esSel
                    ? 'text-white'
                    : esHoy
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-slate-800 dark:text-slate-100'
                }`}>
                  {fecha.getDate()}
                </span>

                {/* Puntos de servicios */}
                {srvs.length > 0 && (
                  <div className="flex gap-0.5 justify-center">
                    {srvs.slice(0, 3).map(srv => {
                      const col = COLORES_SERVICIO[srv.id] ?? { dot: 'bg-slate-400' };
                      return (
                        <span key={srv.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            esSel ? 'bg-violet-200' : col.dot
                          }`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Badge turnos */}
                {nTurnos > 0 && (
                  <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[9px] font-black rounded-full flex items-center justify-center ${
                    esSel
                      ? 'bg-white text-violet-600'
                      : 'bg-violet-600 text-white'
                  }`}>
                    {nTurnos}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Panel detalle del día seleccionado ── */}
      {diaSeleccionado && (
        <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">

          {/* Encabezado del panel */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
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
