'use client';

import { useAccessibility } from '@/context/AccessibilityCtx';
import { designTokens } from '@/config/designTokens';
import { ThemeZoomControls } from '@/components/Controls/ThemeZoomControls';

export function DrawerMain() {
  const { isDarkMode } = useAccessibility();
  const theme = isDarkMode ? designTokens.dark : designTokens.light;

  return (
    <aside
      className={`w-80 flex flex-col border-r ${theme.border} ${theme.sidebar} p-5 overflow-y-auto transition-colors duration-300`}
    >
      {/* Logo y Status */}
      <div className="mb-6">
        <div className="flex items-center text-xs font-mono text-green-600 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
          (Sistema Estable)
        </div>
        <h1 className={`text-2xl font-bold tracking-tight ${theme.text}`}>Ganesha esthetic</h1>
      </div>

      {/* Controls */}
      <ThemeZoomControls />

      {/* Nav Principal */}
      <nav className="flex flex-col gap-1 mb-8">
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium transition-colors ${theme.hover}`}
        >
          📅 Agenda
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium transition-colors ${theme.hover}`}
        >
          🕒 Turnos
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium transition-colors ${theme.hover}`}
        >
          ✨ Depilación
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium transition-colors ${theme.hover}`}
        >
          💅 Uñas
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium transition-colors ${theme.hover}`}
        >
          👁️ Pestañas
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium transition-colors ${theme.hover}`}
        >
          ⚡ Estética hinfus
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium transition-colors ${theme.hover}`}
        >
          📢 Promocionar contactos
        </a>
      </nav>

      {/* Panel de Control */}
      <div className="mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          Panel de control
        </h2>
      </div>
      <nav className="flex flex-col gap-1">
        <a
          href="#"
          className={`p-2 rounded cursor-pointer flex justify-between items-center transition-colors ${theme.hover}`}
        >
          <span className="font-medium text-blue-600">🤖 Comunicación IA</span>
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">Activa</span>
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium text-sm leading-relaxed transition-colors ${theme.hover}`}
        >
          👥 Contactos activos / Visitas confirmadas / Pagos señas / Promociones
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium text-red-500 transition-colors ${theme.hover}`}
        >
          🚫 Contactos negativos
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium text-green-600 transition-colors ${theme.hover}`}
        >
          📱 WhatsApp empresa
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium text-pink-500 opacity-50 transition-colors ${theme.hover}`}
        >
          📸 Instagram chat (Próximamente)
        </a>
        <a
          href="#"
          className={`p-2 rounded cursor-pointer font-medium mt-4 transition-colors ${theme.hover}`}
        >
          ⚙️ Cambiar promociones
        </a>
      </nav>
    </aside>
  );
}
