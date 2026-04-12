'use client';

import { useAccessibility } from '@/context/AccessibilityCtx';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useAccessibility();

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
      {/* Header Admin */}
      <div className={`border-b ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'} p-4`}>
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">⚙️ Panel de Administración</h1>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Configura disponibilidad, servicios y promociones
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {children}
      </div>
    </div>
  );
}
