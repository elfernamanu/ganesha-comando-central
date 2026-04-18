'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppBottomNav } from '@/components/AppBottomNav';
import { EstadoSistema } from '@/components/EstadoSistema';
import { useAccessibility } from '@/context/AccessibilityCtx';
import DispositivoIndicador from '@/components/DispositivoIndicador';

// Mapa de rutas → título para la app bar mobile
const PAGE_TITLES: Record<string, string> = {
  '/admin/panel-control/turnos':      '🕒 Turnos',
  '/admin/panel-control/caja':        '💰 Caja',
  '/admin/panel-control/precios':     '⚙️ Servicios',
  '/admin/panel-control/promociones': '📢 Combos',
  '/admin/panel-control/contactos':   '👥 Contactos',
  '/admin/panel-control/ia':          '🤖 IA',
  '/admin/panel-control/integraciones':'🔗 Integraciones',
  '/admin/panel-control/reportes':    '📈 Reportes',
  '/admin/panel-control':             '⚙️ Panel',
};

function MobileAppBar() {
  const pathname = usePathname();
  const { isDarkMode, toggleTheme } = useAccessibility();

  // Título de la pantalla actual
  const title = Object.entries(PAGE_TITLES)
    .sort((a, b) => b[0].length - a[0].length) // más específico primero
    .find(([route]) => pathname.startsWith(route))?.[1] ?? 'Ganesha';

  const isRoot = pathname === '/admin/panel-control';

  return (
    <div
      className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center h-14 px-2 gap-1">
        {/* Botón atrás — solo en sub-páginas */}
        {!isRoot ? (
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 rounded-xl text-violet-600 dark:text-violet-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
          </Link>
        ) : (
          <Link
            href="/"
            className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
          </Link>
        )}

        {/* Título */}
        <h1 className="flex-1 text-[17px] font-bold text-slate-900 dark:text-white tracking-tight truncate px-1">
          {title}
        </h1>

        {/* Dispositivo */}
        <DispositivoIndicador />

        {/* Estado sistema */}
        <div className="scale-90 origin-right">
          <EstadoSistema compact />
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors text-lg"
        >
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── MOBILE shell ── */}
      <div className="md:hidden min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <MobileAppBar />
        {/* Contenido: padding inferior para la tab bar + safe-area */}
        <main className="flex-1 px-4 py-4" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
          {children}
        </main>
        <AppBottomNav />
      </div>

      {/* ── DESKTOP shell ── */}
      <div className="hidden md:block min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">⚙️ Panel de Administración</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Configura disponibilidad, servicios y promociones
              </p>
            </div>
            <div className="flex items-center gap-3">
              <DispositivoIndicador />
              <Link
                href="/"
                className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
              >
                ← Inicio
              </Link>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto p-6">
          {children}
        </div>
      </div>
    </>
  );
}
