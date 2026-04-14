'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PanelControlLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHub    = pathname === '/admin/panel-control';
  // Turnos es de la secretaria — no debe mostrar acceso al Panel
  const isTurnos = pathname.startsWith('/admin/panel-control/turnos');

  return (
    <div className="space-y-4">
      {/* "← Volver al Panel" — solo en desktop, solo en páginas admin (no en Turnos) */}
      {!isHub && !isTurnos && (
        <Link
          href="/admin/panel-control"
          className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          ← Volver al Panel
        </Link>
      )}
      {children}
    </div>
  );
}
