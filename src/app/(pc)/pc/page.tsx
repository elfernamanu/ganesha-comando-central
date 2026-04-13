'use client';

import { Header } from '@/components/MainContent/Header';
import { ShiftsGrid } from '@/components/MainContent/ShiftsGrid';

export default function PCHomePage() {
  return (
    <>
      <div className="border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 bg-white dark:bg-slate-900">
        <Header />
      </div>
      <main className="flex-1 p-6">
        <ShiftsGrid />
      </main>
      <footer className="text-center py-4 text-sm border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-500">
        <p>Ganesha Esthetic © 2026 | Comando Central</p>
      </footer>
    </>
  );
}
