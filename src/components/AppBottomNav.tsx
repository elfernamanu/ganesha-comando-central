'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/',                           icon: '📅', label: 'Agenda' },
  { href: '/admin/panel-control/turnos', icon: '🕒', label: 'Turnos' },
];

export function AppBottomNav() {
  const pathname = usePathname();

  // Detecta qué tab está activo (del más específico al más general)
  const activeHref = (() => {
    for (const t of [...TABS].reverse()) {
      if (t.href === '/') continue; // "/" matchea todo
      if (pathname.startsWith(t.href)) return t.href;
    }
    if (pathname === '/') return '/';
    return null;
  })();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-700/80 safe-bottom"
    >
      <div className="flex">
        {TABS.map(tab => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : activeHref === tab.href;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-all active:scale-95 ${
                isActive
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <span className="text-[22px] leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-violet-600 dark:text-violet-400' : ''}`}>
                {tab.label}
              </span>
              {/* Punto activo debajo */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-violet-600 dark:bg-violet-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
