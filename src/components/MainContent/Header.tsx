'use client';

import { useAccessibility } from '@/context/AccessibilityCtx';
import { designTokens } from '@/config/designTokens';

export function Header() {
  const { isDarkMode } = useAccessibility();
  const theme = isDarkMode ? designTokens.dark : designTokens.light;

  return (
    <div
      className={`max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center border-b ${theme.border} pb-4`}
    >
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${theme.text}`}>Control de Turnos</h1>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Vista de agenda confirmada por sectores
        </p>
      </div>

      <div
        className={`mt-4 md:mt-0 flex items-center ${theme.sidebar} border ${theme.border} rounded-md shadow-sm p-1 transition-colors duration-300`}
      >
        <button className={`px-3 py-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} hover:${theme.hover} rounded`}>
          ← Ayer
        </button>
        <div className={`px-4 font-semibold text-blue-700 border-x ${theme.border}`}>
          Hoy: Jueves, 12 Abril
        </div>
        <button className={`px-3 py-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} hover:${theme.hover} rounded`}>
          Mañana →
        </button>
      </div>
    </div>
  );
}
