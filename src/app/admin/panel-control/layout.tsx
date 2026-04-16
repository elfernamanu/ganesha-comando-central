'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const ZOOM_STEPS = [0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2.0];
const ZOOM_KEY   = 'ganesha_panel_zoom';

export default function PanelControlLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHub    = pathname === '/admin/panel-control';
  const isTurnos = pathname.startsWith('/admin/panel-control/turnos');

  const [zoomIdx, setZoomIdx] = useState(() => {
    try { const s = localStorage.getItem(ZOOM_KEY); return s ? Number(s) : 2; } catch { return 2; }
  });
  const zoom = ZOOM_STEPS[zoomIdx];

  const zoomMenos = () => setZoomIdx(i => {
    const n = Math.max(0, i - 1);
    try { localStorage.setItem(ZOOM_KEY, String(n)); } catch {}
    return n;
  });
  const zoomMas = () => setZoomIdx(i => {
    const n = Math.min(ZOOM_STEPS.length - 1, i + 1);
    try { localStorage.setItem(ZOOM_KEY, String(n)); } catch {}
    return n;
  });

  return (
    <div className="space-y-2">
      {/* Barra superior — Volver + Zoom (solo en páginas admin, no en Turnos) */}
      {!isHub && !isTurnos && (
        <div className="flex items-center justify-between">
          <Link
            href="/admin/panel-control"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            ← Volver al Panel
          </Link>

          {/* Controles de zoom */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={zoomMenos}
              disabled={zoomIdx === 0}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-colors"
            >A-</button>
            <span className="text-xs text-slate-400 w-12 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomMas}
              disabled={zoomIdx === ZOOM_STEPS.length - 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition-colors"
            >A+</button>
          </div>
        </div>
      )}

      {/* Contenido — con zoom aplicado (excepto Turnos) */}
      {isTurnos ? (
        <>{children}</>
      ) : (
        <div style={{ zoom }}>
          {children}
        </div>
      )}
    </div>
  );
}
