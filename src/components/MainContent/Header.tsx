'use client';

export function Header({ hideBranding }: { hideBranding?: boolean } = {}) {
  const today = new Date();
  // Capitaliza solo la primera letra (no "Lunes, 13 De Abril" sino "Lunes, 13 de abril")
  const dateStr = today
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());

  if (hideBranding) {
    // Versión mobile: solo muestra la fecha de hoy en una línea compacta
    return (
      <div className="px-4 py-2 w-full">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {dateStr}
        </p>
      </div>
    );
  }

  // Versión desktop: título + fecha
  return (
    <div className="px-6 py-4 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Ganesha Esthetic
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {dateStr}
          </p>
        </div>
      </div>
    </div>
  );
}
