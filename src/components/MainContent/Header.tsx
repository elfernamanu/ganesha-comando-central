'use client';

import { useAccessibility } from '@/context/AccessibilityCtx';
import { designTokens } from '@/config/designTokens';

export function Header() {
  const { isDarkMode } = useAccessibility();
  const theme = isDarkMode ? designTokens.dark : designTokens.light;

  const today = new Date();
  const dateStr = `${today.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}`;

  return (
    <div className="px-6 py-4 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Control de Turnos</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Vista de agenda confirmada por sectores
          </p>
        </div>

        <div className={`flex items-center border rounded-md shadow-sm p-1 transition-colors duration-300 ${
          isDarkMode
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-slate-200'
        }`}>
          <button className={`px-3 py-2 rounded hover:opacity-70 transition-opacity ${
            isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
          }`}>
            ← Ayer
          </button>
          <div className={`px-4 py-2 font-semibold text-blue-600 border-x ${
            isDarkMode ? 'border-slate-700' : 'border-slate-200'
          }`}>
            Hoy: {dateStr}
          </div>
          <button className={`px-3 py-2 rounded hover:opacity-70 transition-opacity ${
            isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'
          }`}>
            Mañana →
          </button>
        </div>
      </div>
    </div>
  );
}
