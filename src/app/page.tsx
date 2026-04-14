'use client';

import { DrawerMain } from '@/components/Drawer/DrawerMain';
import { Header } from '@/components/MainContent/Header';
import { AgendaMensual } from '@/components/MainContent/AgendaMensual';
import { AppBottomNav } from '@/components/AppBottomNav';
import { useAccessibility } from '@/context/AccessibilityCtx';
import { EstadoSistema } from '@/components/EstadoSistema';

function MobileAppBar() {
  const { isDarkMode, toggleTheme, zoomIn, zoomOut, zoomLevel } = useAccessibility();

  return (
    <div
      className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* App bar principal */}
      <div className="flex items-center h-14 px-4 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl leading-none">🌺</span>
          <h1 className="text-[17px] font-bold text-slate-900 dark:text-white leading-tight truncate">
            Ganesha esthetic
          </h1>
        </div>
        {/* Estado sistema */}
        <div className="scale-90 origin-right">
          <EstadoSistema compact />
        </div>
        {/* Controles */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={zoomLevel <= 0.8}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold disabled:opacity-40 active:scale-95"
          >A−</button>
          <button
            onClick={zoomIn}
            disabled={zoomLevel >= 1.5}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold disabled:opacity-40 active:scale-95"
          >A+</button>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-lg active:scale-95"
          >{isDarkMode ? '☀️' : '🌙'}</button>
        </div>
      </div>
      {/* Selector de fecha */}
      <Header hideBranding />
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-300">

      {/* ── Desktop ── */}
      <div className="hidden md:flex md:min-h-screen">
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-slate-200 dark:border-slate-700">
          <DrawerMain />
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 bg-white dark:bg-slate-900">
            <Header />
          </div>
          <main className="flex-1 p-6">
            <AgendaMensual />
          </main>
          <footer className="text-center py-4 text-sm border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-500">
            <p>Ganesha Esthetic © 2026 | Comando Central</p>
          </footer>
        </div>
      </div>

      {/* ── Mobile: app nativa ── */}
      <div className="md:hidden flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
        <MobileAppBar />
        <main
          className="flex-1 px-4 py-4"
          style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
        >
          <AgendaMensual />
        </main>
        <AppBottomNav />
      </div>

    </div>
  );
}
