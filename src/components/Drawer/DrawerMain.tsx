'use client';

import Link from 'next/link';
import { ThemeZoomControls } from '@/components/Controls/ThemeZoomControls';

const NAV_ITEMS = [
  { label: '📅 Agenda', href: '#' },
  { label: '🕒 Turnos', href: '/admin/panel-control/turnos' },
  { label: '✨ Depilación', href: '#' },
  { label: '💅 Uñas', href: '#' },
  { label: '👁️ Pestañas', href: '#' },
  { label: '⚡ Estética', href: '#' },
  { label: '📢 Promocionar contactos', href: '#' },
];

export function DrawerMain() {
  return (
    <aside className="w-80 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-5 overflow-y-auto transition-colors duration-300">

      {/* Logo y Status */}
      <div className="mb-6">
        <div className="flex items-center text-xs font-mono text-green-600 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
          (Sistema Estable)
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Ganesha esthetic</h1>
      </div>

      {/* Controls */}
      <ThemeZoomControls />

      {/* Nav Principal */}
      <nav className="flex flex-col gap-1 mb-8">
        {NAV_ITEMS.map((item) => (
          item.href === '#'
            ? (
              <a
                key={item.label}
                href="#"
                className="p-2 rounded cursor-pointer font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {item.label}
              </a>
            )
            : (
              <Link
                key={item.label}
                href={item.href}
                className="p-2 rounded font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 block"
              >
                {item.label}
              </Link>
            )
        ))}
      </nav>

      {/* Panel de Control */}
      <div className="mb-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
          Panel de control
        </h2>
      </div>
      <nav className="flex flex-col gap-1">
        <a href="#" className="p-2 rounded cursor-pointer flex justify-between items-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
          <span className="font-medium text-blue-600">🤖 Comunicación IA</span>
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">Activa</span>
        </a>
        <Link href="/admin/panel-control" className="p-2 rounded cursor-pointer font-medium mt-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 block">
          ⚙️ Panel de Control
        </Link>
      </nav>
    </aside>
  );
}
