'use client';

import { DrawerMain } from '@/components/Drawer/DrawerMain';
import { Header } from '@/components/MainContent/Header';
import { AgendaMensual } from '@/components/MainContent/AgendaMensual';
import { useAccessibility } from '@/context/AccessibilityCtx';
import Link from 'next/link';

function MobileHeader() {
  const { isDarkMode, toggleTheme, zoomIn, zoomOut, zoomLevel } = useAccessibility();

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
      {/* Fila superior: logo + controles */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Sistema Estable
          </div>
          <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">Ganesha esthetic</h1>
        </div>
        {/* Controles accesibilidad */}
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            disabled={zoomLevel <= 0.8}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold disabled:opacity-40"
          >
            A−
          </button>
          <button
            onClick={zoomIn}
            disabled={zoomLevel >= 1.5}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold disabled:opacity-40"
          >
            A+
          </button>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-lg"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <Link
            href="/admin/panel-control"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-lg"
          >
            ⚙️
          </Link>
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

      {/* Desktop: sidebar + main */}
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

      {/* Mobile: header con controles + contenido + nav inferior */}
      <div className="md:hidden flex flex-col min-h-screen">
        <MobileHeader />
        <main className="flex-1 p-4 pb-20">
          <AgendaMensual />
        </main>
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-around py-2 z-20">
          <a href="/" className="flex flex-col items-center gap-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 px-3 py-1">
            <span className="text-xl">📅</span>Agenda
          </a>
          <Link href="/admin/panel-control/turnos" className="flex flex-col items-center gap-0.5 text-xs font-medium text-slate-400 px-3 py-1">
            <span className="text-xl">🕒</span>Turnos
          </Link>
          <a href="/" className="flex flex-col items-center gap-0.5 text-xs font-medium text-slate-400 px-3 py-1">
            <span className="text-xl">✨</span>Servicios
          </a>
          <a href="/" className="flex flex-col items-center gap-0.5 text-xs font-medium text-slate-400 px-3 py-1">
            <span className="text-xl">🤖</span>IA
          </a>
        </nav>
      </div>

    </div>
  );
}
