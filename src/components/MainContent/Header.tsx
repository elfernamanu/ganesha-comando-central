'use client';

export function Header() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="px-6 py-4 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Control de Turnos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Vista de agenda confirmada por sectores
          </p>
        </div>

        <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm p-1 transition-colors duration-300">
          <button className="px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            ← Ayer
          </button>
          <div className="px-4 py-2 font-semibold text-blue-600 border-x border-slate-200 dark:border-slate-700">
            Hoy: {dateStr}
          </div>
          <button className="px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            Mañana →
          </button>
        </div>

      </div>
    </div>
  );
}
