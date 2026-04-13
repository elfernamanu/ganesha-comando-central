import Link from 'next/link';

export default function WebLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Sistema Estable
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">Ganesha esthetic</h1>
        </div>
        <Link href="/admin/panel-control" className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-medium">⚙️ Panel</Link>
      </header>

      <main className="flex-1">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-around py-2 z-20">
        <a href="#" className="flex flex-col items-center gap-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 px-3 py-1">
          <span className="text-lg">📅</span>Agenda
        </a>
        <a href="#" className="flex flex-col items-center gap-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 px-3 py-1">
          <span className="text-lg">🕒</span>Turnos
        </a>
        <a href="#" className="flex flex-col items-center gap-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 px-3 py-1">
          <span className="text-lg">✨</span>Servicios
        </a>
        <a href="#" className="flex flex-col items-center gap-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 px-3 py-1">
          <span className="text-lg">🤖</span>IA
        </a>
      </nav>
      <div className="h-16"></div>
    </div>
  );
}
