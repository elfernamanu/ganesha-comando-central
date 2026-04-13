'use client';

import Link from 'next/link';
import { useCaja } from './hooks/useCaja';

function formatDinero(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(n);
}

function NumeroInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
      onFocus={e => e.currentTarget.select()}
      placeholder={placeholder || '0'}
      className="w-full px-2 py-1 rounded text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono"
    />
  );
}

export default function CajaPage() {
  const hoy = new Date().toISOString().split('T')[0];
  const {
    resumen,
    movimientos,
    gananciaConcepto,
    gananciaMonto,
    mensaje,
    guardando,
    setGananciaConcepto,
    setGananciaMonto,
    agregarGananciaExtra,
    eliminarMovimiento,
    guardar,
  } = useCaja(hoy);

  // Dividir movimientos en 4 columnas
  const columnas = [[], [], [], []] as MovimientoCaja[][];
  movimientos.forEach((mov, idx) => {
    columnas[idx % 4].push(mov);
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">💰 Caja Diaria</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {new Date(hoy).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Link
          href="/admin/panel-control"
          className="text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded"
        >
          ← Panel
        </Link>
      </div>

      {/* Resumen grande */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">TOTAL INGRESOS</p>
        <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{formatDinero(resumen.total_ingresos)}</p>
      </div>

      {/* Mensaje */}
      {mensaje && <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/30 text-sm text-green-800 dark:text-green-200">{mensaje}</div>}

      {/* Agregar ganancia extra */}
      <div className="p-4 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
        <p className="text-sm font-bold">Ganancia Extra</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={gananciaConcepto}
            onChange={e => setGananciaConcepto(e.target.value)}
            placeholder="Ej: Uñas extra"
            className="flex-1 px-2 py-1 rounded text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
          />
          <NumeroInput value={gananciaMonto} onChange={setGananciaMonto} placeholder="Monto" />
          <button
            onClick={agregarGananciaExtra}
            className="px-3 py-1 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
          >
            ➕
          </button>
        </div>
      </div>

      {/* 4 Columnas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {columnas.map((columna, colIdx) => (
          <div key={colIdx} className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-slate-100 dark:bg-slate-700 px-2 py-2 text-xs font-bold border-b border-slate-200 dark:border-slate-600">
              Columna {colIdx + 1} ({columna.length})
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto space-y-1 p-2 max-h-96">
              {columna.map(mov => (
                <div
                  key={mov.id}
                  className={`p-2 rounded text-xs border-l-4 ${
                    mov.tipo === 'cobro'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : mov.tipo === 'seña'
                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-bold truncate flex-1">{mov.clienteNombre}</p>
                    <button
                      onClick={() => eliminarMovimiento(mov.id)}
                      className="text-red-500 hover:text-red-700 ml-1 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{mov.descripcion}</p>
                  <p className="font-bold text-sm mt-1">{formatDinero(mov.monto)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Botones */}
      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 px-4 py-3 rounded-lg bg-blue-600 dark:bg-blue-700 text-white font-bold hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {guardando ? '⏳ Guardando...' : '💾 Guardar Caja'}
        </button>
        <Link
          href="/admin/panel-control/turnos"
          className="flex-1 px-4 py-3 rounded-lg bg-slate-600 dark:bg-slate-700 text-white font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-center"
        >
          📅 Ir a Turnos
        </Link>
      </div>
    </div>
  );
}
