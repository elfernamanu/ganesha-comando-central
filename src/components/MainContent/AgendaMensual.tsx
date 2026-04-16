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
  asistencia: 'presente' | 'no_vino' | '';
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
  const cargarServiciosDesdeLS = useCallback((): CategoriaServicio[] | null => {
    try {
      const raw = localStorage.getItem('ganesha_config_servicios');
      if (raw) {
        const parsed = JSON.parse(raw) as CategoriaServicio[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignorar */ }
    return null;
  }, []);

  const cargarServicios = useCallback(() => {
    // 1. Carga inmediata desde localStorage (sin latencia)
    const fromLS = cargarServiciosDesdeLS();
    if (fromLS) setServicios(fromLS);

    // 2. Fetch al servidor en background (fuente de verdad — sin auth requerida)
    fetch('/api/admin/config', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: { ok: boolean; datos: CategoriaServicio[] }) => {
        if (data.ok && Array.isArray(data.datos) && data.datos.length > 0) {
          const migradas = data.datos.map(c => ({ ...c, jornadas: c.jornadas ?? [] }));
          setServicios(migradas);
          // Sincroniza localStorage para próximas cargas offline
          try { localStorage.setItem('ganesha_config_servicios', JSON.stringify(migradas)); } catch { /* ignorar */ }
        } else if (!fromLS) {
          setServicios(SERVICIOS_DEFAULT);
        }
      })
      .catch(() => {
        // Sin conexión — si no había localStorage tampoco, usar defaults
        if (!fromLS) setServicios(SERVICIOS_DEFAULT);
      });
  }, [cargarServiciosDesdeLS]);

  useEffect(() => {
    cargarServicios();
    // Recargar cuando el usuario vuelve a esta pestaña
    // (por si la dueña configuró servicios en otra pestaña o en el panel admin)
    const onFocus = () => cargarServicios();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [cargarServicios]);

  // ── Leer turnos del día seleccionado (localStorage + servidor) ───────────
  useEffect(() => {
    // SIEMPRE limpiar al cambiar fecha — evita que se vean datos del día anterior
    setTurnos([]);
    if (!diaSeleccionado) return;

    const fechaStr = fechaKey(diaSeleccionado);
    const lsKey    = `ganesha_turnos_${fechaStr}`;

    // 1. localStorage inmediato
    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as TurnoSecretaria[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTurnos([...parsed].sort((a, b) => a.horario.localeCompare(b.horario)));
        }
      }
    } catch { /* silencioso */ }

    // 2. Servidor en background (sincroniza entre celular y PC)
    fetch(`/api/sync?fecha=${fechaStr}`)
      .then(r => r.json())
      .then(({ ok, datos }: { ok: boolean; datos: TurnoSecretaria[] }) => {
        if (!ok || !Array.isArray(datos) || datos.length === 0) return;
        const ordenados = [...datos].sort((a, b) => a.horario.localeCompare(b.horario));
        setTurnos(ordenados);
        try { localStorage.setItem(lsKey, JSON.stringify(datos)); } catch { /* silencioso */ }
      })
      .catch(() => { /* sin conexión */ });
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

  // ── Resolver nombre de tratamiento desde catálogo actual (Opción 2) ──
  const resolverTratamiento = (t: string): string => {
    const i = t.indexOf(': ');
    if (i === -1) return t;
    const prefix = t.substring(0, i);
    for (const cat of servicios) {
      for (const sub of cat.subservicios) {
        if (typeof sub.nombre === 'string' && sub.nombre.startsWith(prefix + ': ')) return sub.nombre;
      }
    }
    return t;
  };

  const keySeleccionado = diaSeleccionado ? fechaKey(diaSeleccionado) : null;

  // ── Solo los días del mes que tienen servicio O turnos cargados ───────────
  const diasActivos = (() => {
    const ultimoDia = new Date(anio, mes + 1, 0).getDate();
    const resultado = [];
    for (let d = 1; d <= ultimoDia; d++) {
      const fecha = new Date(anio, mes, d);
      const srvs = serviciosPorDia(fecha);
      const nTurnos = contarTurnosDia(fecha);
      if (srvs.length > 0) {
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
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={irMesAnterior} aria-label="Mes anterior"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors text-lg font-bold">
          ‹
        </button>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide">
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
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 pt-1 scrollbar-hide">
          {diasActivos.map(({ fecha, srvs, nTurnos }) => {
            const key      = fechaKey(fecha);
            const esSel    = keySeleccionado === key;
            const esHoy    = key === fechaKey(new Date());
            const hoyMid   = new Date(new Date().setHours(0, 0, 0, 0));
            const esPasado = !esHoy && fecha < hoyMid;

            return (
              <button
                key={key}
                onClick={() => setDiaSeleccionado(prev =>
                  prev && fechaKey(prev) === key ? null : fecha
                )}
                className={[
                  'relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl border-2 transition-all shrink-0 min-w-[68px] active:scale-95',
                  esPasado
                    ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-50'
                    : esSel
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/50 shadow-sm'
                      : esHoy
                        ? 'border-violet-300 bg-white dark:bg-slate-800 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 shadow-sm',
                ].join(' ')}
              >
                {/* Nombre día o "Cumplida" */}
                <span className={`text-[10px] font-bold uppercase tracking-wide ${
                  esPasado
                    ? 'text-slate-300 dark:text-slate-600'
                    : esSel
                      ? 'text-violet-500 dark:text-violet-400'
                      : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {esPasado ? 'Cumplida' : DIAS_CORTOS[fecha.getDay()]}
                </span>

                {/* Número */}
                <span className={`text-lg font-black leading-none ${
                  esPasado
                    ? 'text-slate-400 dark:text-slate-600'
                    : esSel
                      ? 'text-violet-700 dark:text-violet-300'
                      : esHoy
                        ? 'text-violet-600 dark:text-violet-400'
                        : 'text-slate-800 dark:text-slate-100'
                }`}>
                  {fecha.getDate()}
                </span>

                {/* Servicios del día con nombre */}
                {srvs.length > 0 && (
                  <div className="flex flex-col gap-0.5 w-full mt-0.5">
                    {srvs.map(srv => {
                      const col = COLORES_SERVICIO[srv.id] ?? { chip: 'bg-slate-100 text-slate-600' };
                      return (
                        <span key={srv.id}
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md text-center w-full leading-tight ${col.chip}`}>
                          {srv.icon} {srv.nombre}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Badge turnos */}
                {nTurnos > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-violet-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
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
        <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">

          {/* Encabezado del panel */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
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
                  className="flex items-start gap-3 px-3 py-0.5"
                >
                  {/* Hora */}
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 w-10 shrink-0 pt-0.5">
                    {turno.horario}
                  </span>

                  {/* Datos */}
                  <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate shrink-0">
                      {turno.clienteNombre}
                    </p>
                    {(turno.tratamiento || turno.detalle) && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate min-w-0">
                        {resolverTratamiento(turno.tratamiento)}{turno.detalle ? ` — ${turno.detalle}` : ''}
                      </p>
                    )}
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
