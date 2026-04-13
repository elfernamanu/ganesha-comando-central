'use client';

import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      {/* Header Admin */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">⚙️ Panel de Administración</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Configura disponibilidad, servicios y promociones
            </p>
          </div>
          <Link
            href="/"
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
          >
            ← Inicio
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {children}
      </div>
    </div>
  );
}
