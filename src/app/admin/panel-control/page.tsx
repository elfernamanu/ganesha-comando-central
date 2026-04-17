'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cerrarSesionPanel } from '@/lib/panelAuth';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Dispositivo {
  id: string;
  nombre: string;
  ip: string;
  primera_vez: string;
  ultima_vez: string;
  visitas: number;
}

// ── Helper: tiempo relativo ───────────────────────────────────────────────────
function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  const hs   = Math.floor(diff / 3_600_000);
  const dias = Math.floor(diff / 86_400_000);
  if (min < 2)   return 'hace un momento';
  if (min < 60)  return `hace ${min} min`;
  if (hs  < 24)  return `hace ${hs} h`;
  if (dias < 7)  return `hace ${dias} día${dias !== 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

const SECCIONES = [
  {
    href: '/admin/panel-control/caja',
    icon: '💰',
    titulo: 'Control de Caja',
    descripcion: 'Ingresos · Gastos · Ganancia neta · Reporte',
    color: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: null,
  },
  {
    href: '/admin/panel-control/precios',
    icon: '⚙️',
    titulo: 'Servicios y Precios',
    descripcion: 'Precios · Días del mes · Categorías',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    badge: null,
  },
  {
    href: '/admin/panel-control/promociones',
    icon: '📢',
    titulo: 'Combos y Promociones',
    descripcion: 'Crear y gestionar combos de servicios',
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    border: 'border-rose-200 dark:border-rose-800',
    badge: null,
  },
  {
    href: '/admin/panel-control/contactos',
    icon: '👥',
    titulo: 'Contactos / CRM',
    descripcion: 'Clientes, visitas, pagos y señas',
    color: 'from-purple-500 to-violet-600',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    badge: null,
  },
  {
    href: '/admin/panel-control/ia',
    icon: '🤖',
    titulo: 'Comunicación IA',
    descripcion: 'Activar IA, configurar prompts y respuestas',
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'Activa',
  },
  {
    href: '/admin/panel-control/integraciones',
    icon: '🔗',
    titulo: 'Integraciones',
    descripcion: 'WhatsApp, Instagram, Telegram y webhooks',
    color: 'from-teal-500 to-emerald-500',
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-200 dark:border-teal-800',
    badge: null,
  },
  {
    href: '/admin/panel-control/reportes',
    icon: '📈',
    titulo: 'Reportes',
    descripcion: 'Gráficos de turnos, ingresos y servicios',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    border: 'border-violet-200 dark:border-violet-800',
    badge: null,
  },
];

export default function PanelControlPage() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);

  useEffect(() => {
    fetch('/api/dispositivos')
      .then(r => r.json())
      .then(data => { if (data.ok) setDispositivos(data.dispositivos ?? []); })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {/* Solo desktop — en mobile lo muestra la app bar */}
          <h2 className="hidden md:block text-2xl font-bold">Panel de Control</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestión central del negocio
          </p>
        </div>
        <button
          onClick={async () => {
            await cerrarSesionPanel();
            window.location.href = '/admin/login';
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 transition-colors active:scale-95"
        >
          🔒 Cerrar sesión
        </button>
      </div>

      {/* Grid de secciones */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECCIONES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`flex flex-col gap-2.5 p-4 rounded-2xl border ${s.border} ${s.bg} shadow-sm hover:shadow-md active:scale-[0.97] transition-all`}
          >
            {/* Icono con fondo gradiente */}
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-xl shadow-sm`}>
                {s.icon}
              </div>
              {s.badge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                  {s.badge}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{s.titulo}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{s.descripcion}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Dispositivos conectados ── */}
      {dispositivos.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wide">
              📱 Dispositivos con acceso
            </p>
            <span className="text-[10px] text-slate-400 font-medium">
              {dispositivos.length} registrado{dispositivos.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {dispositivos.map(d => (
              <div key={d.id} className="flex items-center justify-between px-4 py-2 gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{d.nombre || 'Dispositivo desconocido'}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {d.ip !== 'desconocida' ? `IP: ${d.ip} · ` : ''}{d.visitas} visita{d.visitas !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{tiempoRelativo(d.ultima_vez)}</p>
                  <p className="text-[9px] text-slate-300 dark:text-slate-600">
                    1er acceso: {new Date(d.primera_vez).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
