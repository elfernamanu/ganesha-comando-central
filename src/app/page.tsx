'use client';

import { DrawerMain } from '@/components/Drawer/DrawerMain';
import { Header } from '@/components/MainContent/Header';
import { ShiftsGrid } from '@/components/MainContent/ShiftsGrid';

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-slate-200 dark:border-slate-700">
          <DrawerMain />
        </div>
        {/* Main */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 bg-white dark:bg-slate-900">
            <Header />
          </div>
          <main className="flex-1 p-6">
            <ShiftsGrid />
          </main>
          <footer className="text-center py-4 text-sm border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-500">
            <p>Ganesha Esthetic © 2026 | Comando Central</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
