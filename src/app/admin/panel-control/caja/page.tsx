'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCajaDiaria } from './hooks/useCajaDiaria';
import { useGastosFijos } from './hooks/useGastosFijos';
import { useToast } from '@/components/Toast';
import { generarReporteTxt, descargarReporte } from './utils/reporteGenerator';
import { formatearDinero, formatearHora } from './utils/formatters';
import GastosForm from './components/GastosForm';
import GastosList from './components/GastosList';
import PanelGastosFijos from './components/PanelGastosFijos';
import SugerenciaPago, { type GastoPendienteSugerencia } from './components/SugerenciaPago';
import ResumenCierre from './components/ResumenCierre';
import PanelContactosDia from './components/PanelContactosDia';
import { useFechasHabilitadas } from '../_shared/useFechasHabilitadas';

function CajaContent() {
  const params  = useSearchParams();
  const router  = useRouter();
  // Fecha LOCAL (no UTC) — en Argentina a las 23:30 UTC sería el día siguiente
  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fecha = params.get('fecha') ?? hoy;
  const esHoy = fecha === hoy;

  const { mostrar } = useToast();

  const {
    turnos,
    gastos,
    totales,
    estadoCaja,
    guardando,
    syncGastos,
    agregarGasto,
    eliminarGasto,
    cerrarYGuardar,
    reabrirDia,
    cargarTurnos,
    recuperarReporte,
    recargarDesdeServidor,
    snapshotFijosEmpresa,
    snapshotFijosPersonal,
  } = useCajaDiaria(fecha);

  const {
    empresa: gastosFijosEmpresa,
    personal: gastosFijosPersonal,
    mes: mesGastos,
    mesAnterior: mesAnteriorGastos,
    nombreMesAnterior,
    nombreMesActual,
    deudaMesAnterior,
    guardando: guardandoFijos,
    syncStatus: syncFijos,
    getPagoMes,
    agregarEmpresa,
    agregarPersonal,
    pagarGasto: pagarGastoFijo,
    resetearGasto,
    eliminarGasto: eliminarGastoFijo,
    actualizarMonto,
    actualizarNombre,
    guardar: guardarFijos,
    totalPendienteEmpresa,
    totalPendientePersonal,
  } = useGastosFijos(fecha);

  // ── Catálogo de promos: parsea localStorage UNA sola vez ──────────────────
  const catalogoNombres = useMemo<Map<string, string>>(() => {
    const mapa = new Map<string, string>();
    if (typeof window === 'undefined') return mapa;
    try {
      const raw = localStorage.getItem('ganesha_config_servicios');
      if (!raw) return mapa;
      const cats = JSON.parse(raw) as Array<{ subservicios: Array<{ nombre: string }> }>;
      for (const cat of cats) {
        for (const sub of cat.subservicios ?? []) {
          if (typeof sub.nombre === 'string') {
            const i = sub.nombre.indexOf(': ');
            if (i > -1) mapa.set(sub.nombre.substring(0, i), sub.nombre);
          }
        }
      }
    } catch { /* silencioso */ }
    return mapa;
  }, []); // solo en mount

  const resolverTratamiento = useCallback((t: string): string => {
    const i = t.indexOf(': ');
    return i > -1 ? (catalogoNombres.get(t.substring(0, i)) ?? t) : t;
  }, [catalogoNombres]);

  // ── Sugerencia de pago ──
  const [sugerencia, setSugerencia] = useState<{
    visible: boolean;
    montoPagado: number;
    clienteNombre: string;
  } | null>(null);

  // Detecta cuando un turno cambia a "presente" con pago
  const turnosAnteriorRef = useRef<typeof turnos>([]);
  useEffect(() => {
    const anterior = turnosAnteriorRef.current;
    if (anterior.length === 0) {
      turnosAnteriorRef.current = turnos;
      return;
    }
    for (const t of turnos) {
      const prev = anterior.find(p => p.id === t.id);
      if (
        t.asistencia === 'presente' &&
        (t.seña_pagada ?? 0) > 0 &&
        (!prev || prev.asistencia !== 'presente' || (prev.seña_pagada ?? 0) !== (t.seña_pagada ?? 0))
      ) {
        const pendientes = [
          ...gastosFijosEmpresa.filter(g => !getPagoMes(g).pagado),
          ...gastosFijosPersonal.filter(g => !getPagoMes(g).pagado),
        ];
        if (pendientes.length > 0) {
          setSugerencia({ visible: true, montoPagado: t.seña_pagada ?? 0, clienteNombre: t.clienteNombre });
        }
        break;
      }
    }
    turnosAnteriorRef.current = turnos;
  }, [turnos, gastosFijosEmpresa, gastosFijosPersonal]);

  // ── Estado local para recuperar reporte ──
  const [fechaRecuperar, setFechaRecuperar] = useState('');
  const [recuperando, setRecuperando] = useState(false);
  const [mensajeRecuperar, setMensajeRecuperar] = useState('');

  // ── Estado para recuperar TODO del servidor (botón de rescate) ──
  const [rescatando, setRescatando] = useState(false);
  const [mensajeRescate, setMensajeRescate] = useState('');

  const handleRescatarServidor = async () => {
    setRescatando(true);
    setMensajeRescate('');
    const { turnosRecuperados, gastosRecuperados, cerrada } = await recargarDesdeServidor();
    if (turnosRecuperados > 0 || gastosRecuperados > 0) {
      setMensajeRescate(`✅ Recuperado del servidor: ${turnosRecuperados} turno${turnosRecuperados !== 1 ? 's' : ''} · ${gastosRecuperados} gasto${gastosRecuperados !== 1 ? 's' : ''} del día${cerrada ? ' · Caja CERRADA' : ''}`);
    } else {
      setMensajeRescate('⚠️ No se encontraron datos en el servidor para esta fecha. Revisá la conexión o la fecha.');
    }
    setRescatando(false);
    setTimeout(() => setMensajeRescate(''), 10000);
  };

  // ── Estado para limpieza de datos viejos ──
  const [limpiandoViejos, setLimpiandoViejos] = useState(false);
  const [mensajeLimpieza, setMensajeLimpieza] = useState('');

  const limpiarDatosAnteriores = async (anteriorA: string) => {
    setLimpiandoViejos(true);
    setMensajeLimpieza('');
    try {
      // 1. Borrar del servidor (PostgreSQL)
      const [rCaja, rTurnos] = await Promise.all([
        fetch(`/api/caja?antes_de=${anteriorA}`, { method: 'DELETE' }).then(r => r.json()),
        fetch(`/api/sync?antes_de=${anteriorA}`, { method: 'DELETE' }).then(r => r.json()),
      ]);
      const caja   = rCaja.borrados   ?? 0;
      const turnos = rTurnos.borrados ?? 0;

      // 2. Borrar del localStorage (datos que nunca llegaron al servidor)
      let lsBorrados = 0;
      try {
        const keysABorrar: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i) ?? '';
          // Patrones: ganesha_turnos_YYYY-MM-DD  y  ganesha_gastos_YYYY-MM-DD
          const match = k.match(/^ganesha_(turnos|gastos)_(\d{4}-\d{2}-\d{2})$/);
          if (match && match[2] < anteriorA) keysABorrar.push(k);
        }
        keysABorrar.forEach(k => { localStorage.removeItem(k); lsBorrados++; });
      } catch { /* silencioso */ }

      setMensajeLimpieza(`✅ Eliminados del servidor: ${caja} día${caja!==1?'s':''} de caja · ${turnos} de turnos | Del dispositivo: ${lsBorrados} registro${lsBorrados!==1?'s':''} — anteriores al ${anteriorA}`);
    } catch {
      setMensajeLimpieza('⚠️ Error al limpiar — verificá conexión');
    }
    setLimpiandoViejos(false);
    setTimeout(() => setMensajeLimpieza(''), 10000);
  };

  const fechasHabilitadas = useFechasHabilitadas();

  // ── Caja siempre muestra HOY por defecto — no redirigir aunque no haya jornada ──
  // (a diferencia de Turnos, la caja se usa todos los días sin importar el calendario de jornadas)

  // Fecha anterior y siguiente
  const fechaObj = new Date(fecha + 'T12:00:00');
  const prevDate = new Date(fechaObj); prevDate.setDate(prevDate.getDate() - 1);
  const nextDate = new Date(fechaObj); nextDate.setDate(nextDate.getDate() + 1);
  const prevStr = prevDate.toISOString().split('T')[0];
  const nextStr = nextDate.toISOString().split('T')[0];

  const fechaLabel = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());

  // Gastos fijos enriquecidos con el estado del mes actual (para panel editable — siempre actual)
  const fijosEmpresaConPago  = gastosFijosEmpresa.map(g => ({ ...g, montoAcumulado: getPagoMes(g).montoAcumulado, pagado: getPagoMes(g).pagado }));
  const fijosPersonalConPago = gastosFijosPersonal.map(g => ({ ...g, montoAcumulado: getPagoMes(g).montoAcumulado, pagado: getPagoMes(g).pagado }));

  // Para ResumenCierre y reporte: si la caja está cerrada y hay snapshot histórico,
  // usarlo en lugar de los fijos actuales (muestra los valores de cuando se cerró la caja)
  const fijosEmpresaParaResumen  = estadoCaja === 'cerrada' && snapshotFijosEmpresa.length  > 0 ? snapshotFijosEmpresa  : fijosEmpresaConPago;
  const fijosPersonalParaResumen = estadoCaja === 'cerrada' && snapshotFijosPersonal.length > 0 ? snapshotFijosPersonal : fijosPersonalConPago;

  const totalFijosEmpresa = fijosEmpresaConPago.reduce((sum, g) => sum + g.montoAcumulado, 0);
  const totalFijosPersonal = fijosPersonalConPago.reduce((sum, g) => sum + g.montoAcumulado, 0);
  const totalGastosCompleto = totales.gastos_totales + totalFijosEmpresa + totalFijosPersonal;
  const gananciaNeta = totales.ingresos_totales - totalGastosCompleto;

  // Cerrar + guardar + descargar .txt — todo en uno
  // Los gastos fijos se pasan para guardar snapshot histórico en caja_diaria
  const handleCerrarYGuardar = async () => {
    const ok = await cerrarYGuardar(fijosEmpresaConPago, fijosPersonalConPago);
    if (ok) {
      mostrar('Caja cerrada y guardada', 'exito', 'El resumen del día llegó al servidor ✓');
      setFechaRecuperar(fecha);
      const contenido = generarReporteTxt(fecha, turnos, gastos, totales, fijosEmpresaConPago, fijosPersonalConPago);
      descargarReporte(contenido, fecha);
    } else {
      mostrar('Error al guardar caja', 'error', 'Verificá la conexión con el servidor');
    }
  };

  // Solo descargar .txt del día actual (sin cerrar)
  // Usa el snapshot histórico si la caja está cerrada (para que el reporte sea fiel a cuando se cerró)
  const handleDescargarHoy = () => {
    const contenido = generarReporteTxt(fecha, turnos, gastos, totales, fijosEmpresaParaResumen, fijosPersonalParaResumen);
    descargarReporte(contenido, fecha);
  };

  // Recuperar reporte de un día pasado desde PostgreSQL
  const handleRecuperar = async () => {
    if (!fechaRecuperar) return;
    setRecuperando(true);
    setMensajeRecuperar('');

    const resultado = await recuperarReporte(fechaRecuperar);

    if (resultado.encontrado && resultado.turnos && resultado.totales) {
      const contenido = generarReporteTxt(
        fechaRecuperar,
        resultado.turnos,
        resultado.gastos ?? [],
        resultado.totales,
        resultado.gastosFijosEmpresa  ?? [],
        resultado.gastosFijosPersonal ?? [],
      );
      descargarReporte(contenido, fechaRecuperar);
      setMensajeRecuperar(`✅ Reporte de ${fechaRecuperar} descargado`);
    } else {
      setMensajeRecuperar(`⚠️ No se encontró caja para ${fechaRecuperar}`);
    }

    setRecuperando(false);
    setTimeout(() => setMensajeRecuperar(''), 5000);
  };

  return (
    <div className="space-y-2 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="hidden md:block text-xl font-bold">💰 Control de Caja</h1>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 flex-wrap">
            {fechaLabel}
            {!esHoy && (
              <Link href="/admin/panel-control/caja"
                className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline">
                → Ir a hoy
              </Link>
            )}
            {estadoCaja === 'cerrada' && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-semibold">
                🔒 Cerrada
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={cargarTurnos}
            title="Refrescar turnos de la secretaria"
            className="text-xs px-2 py-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            🔄
          </button>
          <Link
            href="/admin/panel-control"
            className="text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded"
          >
            ← Panel
          </Link>
        </div>
      </div>

      {/* ── Botón de recuperación del servidor ── */}
      <div className="rounded-xl border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-amber-800 dark:text-amber-300">🛟 ¿Faltan datos? — Recuperar del servidor</p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400">Trae todos los turnos y gastos del día que estén guardados en el servidor</p>
          {mensajeRescate && (
            <p className={`text-[10px] font-semibold mt-0.5 ${mensajeRescate.startsWith('✅') ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>
              {mensajeRescate}
            </p>
          )}
        </div>
        <button
          onClick={handleRescatarServidor}
          disabled={rescatando}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs transition-colors"
        >
          {rescatando ? '⏳ Recuperando...' : '🛟 Recuperar todo'}
        </button>
      </div>

      {/* ── Fechas habilitadas — acceso rápido (solo hoy en adelante) ── */}
      {fechasHabilitadas.filter(({ fecha: f }) => f >= hoy).length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {fechasHabilitadas
            .filter(({ fecha: f }) => f >= hoy)
            .map(({ fecha: f, servicios }) => {
              const esSeleccionada = f === fecha;
              const label = new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
              return (
                <Link key={f} href={`/admin/panel-control/caja?fecha=${f}`}
                  className={`flex flex-col items-center px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    esSeleccionada
                      ? 'bg-violet-600 text-white border-violet-600 shadow'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-violet-400'
                  }`}>
                  <span className="text-[11px] font-extrabold">{label}</span>
                  <span className="text-[9px] font-medium opacity-80">{servicios.join(' · ')}</span>
                </Link>
              );
            })}
        </div>
      )}

      {/* ── Navegación entre días ── */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 rounded-2xl px-3 py-2 border border-slate-100 dark:border-slate-700 shadow-sm">
        <Link
          href={`/admin/panel-control/caja?fecha=${prevStr}`}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          Anterior
        </Link>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">
          {esHoy ? '📅 Hoy' : fecha}
        </span>
        <Link
          href={`/admin/panel-control/caja?fecha=${nextStr}`}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
        >
          Siguiente
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </Link>
      </div>

      <div className="space-y-2">

      {/* ── Estadísticas — franja compacta ── */}
      <div className="flex divide-x divide-slate-200 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
        <div className="flex-1 flex items-center gap-2 px-3 py-1">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase shrink-0">💰 Ingresos</span>
          <span className="text-xs font-bold font-mono text-emerald-800 dark:text-emerald-200">{formatearDinero(totales.ingresos_totales)}</span>
          <span className="text-[10px] text-slate-400 ml-auto">{totales.turnos_presentes} cob.</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-1">
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase shrink-0">💸 Gastos</span>
          <span className="text-xs font-bold font-mono text-red-800 dark:text-red-200">{formatearDinero(totales.gastos_totales)}</span>
          <span className="text-[10px] text-slate-400 ml-auto">{gastos.length} gs.</span>
        </div>
        <div className="flex-1 flex items-center gap-2 px-3 py-1">
          <span className={`text-[10px] font-bold uppercase shrink-0 ${totales.ganancia_neta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>📈 Ganancia</span>
          <span className={`text-xs font-bold font-mono ${totales.ganancia_neta >= 0 ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'}`}>{formatearDinero(totales.ganancia_neta)}</span>
        </div>
      </div>

      {/* ── Turnos del día (solo lectura) ── */}
      <section>
        <div className="flex justify-between items-center mb-1.5">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            📅 Turnos del día ({totales.turnos_total})
          </h2>
          <span className="text-[10px] text-slate-400">
            {totales.turnos_presentes} presente · {totales.turnos_ausentes} no vino
          </span>
        </div>

        {turnos.length === 0 ? (
          <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-center text-sm text-slate-400">
            La secretaria no cargó turnos todavía.
            <button onClick={cargarTurnos} className="block mx-auto mt-1 text-blue-600 dark:text-blue-400 hover:underline text-xs">
              🔄 Reintentar
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {turnos.slice().sort((a, b) => a.horario.localeCompare(b.horario)).map((t) => (
                <div key={t.id} className={`flex items-center gap-2 px-3 py-px ${
                  t.asistencia === 'no_vino'
                    ? 'bg-red-50 dark:bg-red-900/10 opacity-60'
                    : t.asistencia === 'presente'
                    ? 'bg-emerald-50 dark:bg-emerald-900/10'
                    : 'bg-white dark:bg-slate-800'
                }`}>
                  {/* Hora */}
                  <span className="font-mono text-xs font-bold text-slate-400 w-10 shrink-0">{formatearHora(t.horario)}</span>
                  {/* Nombre + servicio inline — mismo formato que Agenda */}
                  <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate shrink-0">{t.clienteNombre}</p>
                    {(t.tratamiento && t.tratamiento !== 'Otro') && (
                      <p className={`text-[11px] truncate min-w-0 ${t.tratamiento.includes('(Hombre)') ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400'}`}>{resolverTratamiento(t.tratamiento)}</p>
                    )}
                  </div>
                  {/* Monto cobrado (solo si presente) */}
                  {t.asistencia === 'presente' && (
                    <span className="shrink-0 text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300">
                      {formatearDinero(t.seña_pagada)}
                      <span className="text-[9px] font-normal text-slate-400 ml-0.5">
                        {t.metodo_pago === 'efectivo' ? 'Ef.' : t.metodo_pago === 'transferencia' ? 'Tr.' : 'Ot.'}
                      </span>
                    </span>
                  )}
                  {/* Badge estado — igual que Agenda */}
                  <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    t.asistencia === 'no_vino'    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    t.estado_pago === 'completo'  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    t.estado_pago === 'seña'      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400'
                  }`}>
                    {t.asistencia === 'no_vino'   ? 'No vino' :
                     t.estado_pago === 'completo' ? 'Completo' :
                     t.estado_pago === 'seña'     ? 'Seña' : 'Sin pago'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Gastos Fijos (empresa + personal) ── */}
      <PanelGastosFijos
        empresa={gastosFijosEmpresa}
        personal={gastosFijosPersonal}
        mes={mesGastos}
        mesAnterior={mesAnteriorGastos}
        nombreMesAnterior={nombreMesAnterior}
        nombreMesActual={nombreMesActual}
        deudaMesAnterior={deudaMesAnterior}
        guardando={guardandoFijos}
        syncStatus={syncFijos}
        getPagoMes={getPagoMes}
        onPagar={pagarGastoFijo}
        onReset={resetearGasto}
        onEliminar={eliminarGastoFijo}
        onActualizarMonto={actualizarMonto}
        onActualizarNombre={actualizarNombre}
        onAgregarEmpresa={agregarEmpresa}
        onAgregarPersonal={agregarPersonal}
        onGuardar={guardarFijos}
        totalPendienteEmpresa={totalPendienteEmpresa}
        totalPendientePersonal={totalPendientePersonal}
      />

      {/* ── Gastos del día ── */}
      <section>
        {/* Header con indicador de auto-guardado */}
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">💸 Gastos del día</p>
          <span className={`text-[10px] font-bold transition-all ${
            syncGastos === 'guardando' ? 'text-amber-500 animate-pulse' :
            syncGastos === 'guardado'  ? 'text-emerald-600 dark:text-emerald-400' :
            syncGastos === 'error'     ? 'text-red-500' :
            'text-transparent'
          }`}>
            {syncGastos === 'guardando' ? '⏳ guardando...' :
             syncGastos === 'guardado'  ? '✓ guardado en servidor' :
             syncGastos === 'error'     ? '⚠ sin conexión' : '·'}
          </span>
        </div>
        <GastosForm onAgregar={agregarGasto} />
        {gastos.length > 0 && <div className="mt-1.5"><GastosList gastos={gastos} onEliminar={eliminarGasto} /></div>}
      </section>

      {/* ── Cierre de día — resumen profesional ── */}
      <ResumenCierre
        fecha={fecha}
        estadoCaja={estadoCaja}
        totales={totales}
        turnos={turnos}
        gastos={gastos}
        gastosFijosEmpresa={fijosEmpresaParaResumen}
        gastosFijosPersonal={fijosPersonalParaResumen}
      />

      {/* ── Contactos del día — visible siempre que haya turnos ── */}
      {turnos.length > 0 && (
        <PanelContactosDia turnos={turnos} />
      )}

      {/* ── Botones de acción — fuera del recuadro ── */}
      <div className="flex gap-2">
        <button
          onClick={handleDescargarHoy}
          disabled={turnos.length === 0 && gastos.length === 0}
          className="flex-1 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          📥 Descargar .txt
        </button>
        {estadoCaja === 'abierta' ? (
          <button
            onClick={handleCerrarYGuardar}
            disabled={guardando}
            className="flex-1 px-3 py-1.5 rounded-lg bg-red-600 dark:bg-red-700 text-white font-bold text-xs hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {guardando ? '⏳ Guardando...' : '🔒 Cerrar Caja — Guardar y Descargar'}
          </button>
        ) : (
          <button
            onClick={reabrirDia}
            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-500 dark:bg-slate-600 text-white font-bold text-xs hover:bg-slate-600 transition-colors"
          >
            🔓 Reabrir Caja
          </button>
        )}
      </div>

      {/* ── Recuperar reporte pasado — una línea ── */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide shrink-0">🗄️ Reporte anterior</span>
        <input type="date" value={fechaRecuperar} onChange={e => setFechaRecuperar(e.target.value)} max={hoy}
          className="flex-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" />
        <button onClick={handleRecuperar} disabled={!fechaRecuperar || recuperando}
          className="px-2.5 py-0.5 rounded-lg bg-slate-600 dark:bg-slate-500 text-white font-bold text-xs hover:bg-slate-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0">
          {recuperando ? '⏳' : '📋 Descargar'}
        </button>
        {mensajeRecuperar && <span className="text-[10px] text-slate-500">{mensajeRecuperar}</span>}
      </div>

      {/* ── Limpiar datos de prueba anteriores a una fecha ── */}
      <details className="group">
        <summary className="text-[9px] font-bold text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-red-500 transition-colors">
          🗑️ Borrar datos anteriores a una fecha (limpieza de pruebas)
        </summary>
        <div className="mt-1.5 p-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/15 space-y-1.5">
          <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
            ⚠️ Borra PERMANENTEMENTE todos los turnos y datos de caja anteriores a la fecha elegida. No se puede deshacer.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500 shrink-0">Borrar todo antes del:</span>
            <input type="date" defaultValue={hoy} id="fecha-limpieza"
              max={hoy}
              className="flex-1 px-2 py-0.5 rounded border border-red-300 dark:border-red-700 bg-white dark:bg-slate-700 text-xs" />
            <button
              disabled={limpiandoViejos}
              onClick={() => {
                const input = document.getElementById('fecha-limpieza') as HTMLInputElement;
                const val = input?.value;
                if (!val) return;
                if (confirm(`¿Segura que querés borrar TODOS los datos anteriores al ${val}? Esta acción NO se puede deshacer.`)) {
                  limpiarDatosAnteriores(val);
                }
              }}
              className="px-2.5 py-0.5 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0">
              {limpiandoViejos ? '⏳' : '🗑️ Borrar'}
            </button>
          </div>
          {mensajeLimpieza && (
            <p className={`text-[10px] font-medium ${mensajeLimpieza.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>
              {mensajeLimpieza}
            </p>
          )}
        </div>
      </details>

      </div>

      {/* ── Sugerencia de pago a gastos fijos ── */}
      {sugerencia?.visible && (
        <SugerenciaPago
          montoPagado={sugerencia.montoPagado}
          clienteNombre={sugerencia.clienteNombre}
          gastosPendientes={[
            ...gastosFijosEmpresa
              .filter(g => !getPagoMes(g).pagado)
              .map(g => ({ ...g, pagoMes: getPagoMes(g) }) satisfies GastoPendienteSugerencia),
            ...gastosFijosPersonal
              .filter(g => !getPagoMes(g).pagado)
              .map(g => ({ ...g, pagoMes: getPagoMes(g) }) satisfies GastoPendienteSugerencia),
          ]}
          onAplicar={pagarGastoFijo}
          onCerrar={() => setSugerencia(null)}
        />
      )}

    </div>
  );
}

export default function CajaPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Cargando caja...</p>
      </div>
    }>
      <CajaContent />
    </Suspense>
  );
}
