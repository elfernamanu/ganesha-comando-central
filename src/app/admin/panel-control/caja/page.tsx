'use client';

import { useCajaDiaria } from './hooks/useCajaDiaria';
import { generarYDescargarReporte } from './utils/reporteGenerator';
import { formatearFecha } from './utils/formatters';

// Componentes
import TurnoCard from './components/TurnoCard';
import GastosForm from './components/GastosForm';
import GastosList from './components/GastosList';
import EstadisticasResumen from './components/EstadisticasResumen';
import CierreDiaSection from './components/CierreDiaSection';

export default function CajaPage() {
  // Hook central con toda la lógica
  const hoy = new Date().toISOString().split('T')[0];
  const {
    caja,
    totales,
    mensaje,
    guardando,
    agregarTurno,
    actualizarTurno,
    eliminarTurno,
    agregarGasto,
    eliminarGasto,
    cerrarDia,
    guardar,
  } = useCajaDiaria(hoy);

  const handleDescargar = () => {
    generarYDescargarReporte(caja, totales);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">💰 Control de Caja</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {formatearFecha(new Date())}
        </p>
      </div>

      {/* Mensaje de estado */}
      {mensaje && (
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200">
          {mensaje}
        </div>
      )}

      {/* Estadísticas */}
      <EstadisticasResumen
        ingresos={totales.ingresos_totales}
        gastos={totales.gastos_totales}
        ganancia={totales.ganancia_neta}
      />

      {/* Turnos */}
      <section className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            📅 Turnos del Día ({caja.turnos.length})
          </h2>
        </div>

        {caja.turnos.length === 0 ? (
          <div className="p-6 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-center text-slate-400 dark:text-slate-500">
            Sin turnos registrados
          </div>
        ) : (
          <div className="space-y-3">
            {caja.turnos.map(turno => (
              <TurnoCard
                key={turno.id}
                turno={turno}
                onActualizar={(id, cambios) => actualizarTurno(id, cambios)}
                onEliminar={eliminarTurno}
              />
            ))}
          </div>
        )}
      </section>

      {/* Gastos */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">💸 Gastos</h2>
        <GastosForm onAgregar={agregarGasto} />
        {caja.gastos.length > 0 && (
          <GastosList gastos={caja.gastos} onEliminar={eliminarGasto} />
        )}
      </section>

      {/* Cierre de día */}
      <CierreDiaSection
        caja={caja}
        totales={totales}
        onDescargar={handleDescargar}
        onCerrar={cerrarDia}
      />

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={guardar}
          disabled={guardando || caja.estado === 'cerrada'}
          className={`flex-1 px-6 py-3 rounded-lg font-bold transition-colors ${
            guardando || caja.estado === 'cerrada'
              ? 'bg-slate-200 dark:bg-slate-600 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
          }`}
        >
          {guardando ? '⏳ Guardando...' : '💾 Guardar Cambios'}
        </button>
      </div>

      {/* Info de ayuda */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-900 dark:text-blue-100">
        <p className="font-semibold mb-2">💡 Cómo usar:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>Marca cada turno como: Sin seña → Seña pagada → Pagado completo</li>
          <li>Ingresa el monto exacto que pagó cada cliente</li>
          <li>Agrega los gastos del día (alquiler, luz, agua, etc.)</li>
          <li>Los totales se calculan automáticamente</li>
          <li>Descarga el reporte .txt para tener un registro del día</li>
          <li>Cierra la caja al final del día</li>
        </ul>
      </div>
    </div>
  );
}
