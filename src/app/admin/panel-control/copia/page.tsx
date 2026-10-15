'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DiaTurnos {
  fecha: string;
  total: number;
  presentes: number;
  ausentes: number;
  cobrado: number;
}

interface Resumen {
  claves: Record<string, unknown>;
  dias: DiaTurnos[];
  totalTurnos: number;
  contactos: number;
  categorias: number;
  combos: number;
  gastosFijos: number;
  diasConGastos: number;
}

function leerJSON(raw: string | null): unknown {
  if (raw === null) return null;
  try { return JSON.parse(raw); } catch { return raw; }
}

function largo(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

function leerDispositivo(): Resumen {
  const claves: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('ganesha')) claves[k] = leerJSON(localStorage.getItem(k));
  }

  const dias: DiaTurnos[] = [];
  for (const [k, v] of Object.entries(claves)) {
    if (!k.startsWith('ganesha_turnos_') || !Array.isArray(v) || v.length === 0) continue;
    const turnos = v as Array<{ asistencia?: string; seña_pagada?: number }>;
    dias.push({
      fecha: k.replace('ganesha_turnos_', ''),
      total: turnos.length,
      presentes: turnos.filter(t => t.asistencia === 'presente').length,
      ausentes: turnos.filter(t => t.asistencia === 'no_vino').length,
      cobrado: turnos.reduce((s, t) => s + (Number(t.seña_pagada) || 0), 0),
    });
  }
  dias.sort((a, b) => b.fecha.localeCompare(a.fecha));

  return {
    claves,
    dias,
    totalTurnos: dias.reduce((s, d) => s + d.total, 0),
    contactos: largo(claves['ganesha_clientes_backup']),
    categorias: largo(claves['ganesha_config_servicios']),
    combos: largo(claves['ganesha_catalog_combos_raw']),
    gastosFijos: largo(claves['ganesha_gastos_fijos_empresa_v2']) + largo(claves['ganesha_gastos_fijos_personal_v2']),
    diasConGastos: Object.entries(claves).filter(([k, v]) => k.startsWith('ganesha_gastos_') && !k.startsWith('ganesha_gastos_fijos') && largo(v) > 0).length,
  };
}

function armarArchivo(r: Resumen): string {
  return JSON.stringify({
    app: 'ganesha-comando-central',
    tipo: 'copia-dispositivo',
    version: 1,
    creado: new Date().toISOString(),
    dispositivo: navigator.userAgent,
    claves: r.claves,
  }, null, 2);
}

const fmtFecha = (f: string) =>
  new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function CopiaPage() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    try { setResumen(leerDispositivo()); } catch { setAviso('No se pudo leer la memoria de este navegador.'); }
  }, []);

  const descargar = () => {
    if (!resumen) return;
    const blob = new Blob([armarArchivo(resumen)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const ahora = new Date();
    const sello = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}_${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `GANESHA_COPIA_${sello}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setAviso('Archivo descargado. Guardalo en un pendrive, en Google Drive o mandátelo por mail.');
  };

  const copiar = async () => {
    if (!resumen) return;
    try {
      await navigator.clipboard.writeText(armarArchivo(resumen));
      setAviso('Copia pegada en el portapapeles. Pegala en un mail o en un documento.');
    } catch {
      setAviso('Este navegador no deja copiar. Usá el botón Descargar.');
    }
  };

  if (!resumen) {
    return <p className="text-sm text-slate-500 py-10 text-center">{aviso || 'Leyendo los datos de este dispositivo...'}</p>;
  }

  const vacio = Object.keys(resumen.claves).length === 0;
  const desde = resumen.dias[resumen.dias.length - 1]?.fecha;
  const hasta = resumen.dias[0]?.fecha;

  const tarjetas = [
    { label: 'Días con turnos', valor: resumen.dias.length },
    { label: 'Turnos en total', valor: resumen.totalTurnos },
    { label: 'Contactos', valor: resumen.contactos },
    { label: 'Categorías de servicios', valor: resumen.categorias },
    { label: 'Combos', valor: resumen.combos },
    { label: 'Gastos fijos', valor: resumen.gastosFijos },
  ];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="space-y-1">
        <h1 className="hidden md:block text-xl font-bold">💾 Copia de seguridad de este dispositivo</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Todo lo que este navegador tiene guardado del sistema: turnos, contactos, precios, combos y gastos.
          Descargá el archivo y guardalo en un lugar seguro.
        </p>
      </div>

      {vacio ? (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
          Este dispositivo no tiene datos guardados del sistema. Probá desde la PC o el celular donde se usa la app todos los días.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {tarjetas.map(t => (
              <div key={t.label} className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 shadow-sm">
                <p className="text-[11px] text-slate-400 font-medium">{t.label}</p>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-white tabular-nums">{t.valor}</p>
              </div>
            ))}
          </div>

          {desde && hasta && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Turnos guardados desde el <b>{fmtFecha(desde)}</b> hasta el <b>{fmtFecha(hasta)}</b>
              {resumen.diasConGastos > 0 && <> · {resumen.diasConGastos} días con gastos de caja</>}
            </p>
          )}

          <div className="flex gap-2 flex-wrap">
            <button onClick={descargar}
              className="flex-1 min-w-[180px] px-4 py-3 rounded-2xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 active:scale-[0.98] transition-all">
              ⬇️ Descargar copia (.json)
            </button>
            <button onClick={copiar}
              className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600">
              📋 Copiar
            </button>
          </div>
        </>
      )}

      {aviso && (
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl px-3 py-2">{aviso}</p>
      )}

      {resumen.dias.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="grid grid-cols-[1fr_56px_56px_56px_88px] gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
            <span>Día</span><span className="text-right">Turnos</span><span className="text-right">Vino</span><span className="text-right">Faltó</span><span className="text-right">Cobrado</span>
          </div>
          <div className="max-h-[50vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
            {resumen.dias.map(d => (
              <Link key={d.fecha} href={`/admin/panel-control/turnos?fecha=${d.fecha}`}
                className="grid grid-cols-[1fr_56px_56px_56px_88px] gap-2 px-3 py-2 text-sm hover:bg-violet-50 dark:hover:bg-slate-800 tabular-nums">
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{fmtFecha(d.fecha)}</span>
                <span className="text-right">{d.total}</span>
                <span className="text-right text-green-600">{d.presentes}</span>
                <span className="text-right text-red-500">{d.ausentes}</span>
                <span className="text-right">${d.cobrado.toLocaleString('es-AR')}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
