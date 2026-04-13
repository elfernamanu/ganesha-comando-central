'use client';

import Link from 'next/link';

const SECCIONES = [
  {
    href: '/admin/panel-control/caja',
    icon: '💰',
    titulo: 'Control de Caja',
    descripcion: 'Ingresos · Gastos · Ganancia neta · Reporte .txt',
    color: 'border-emerald-400 dark:border-emerald-600',
    badge: null,
  },
  {
    href: '/admin/panel-control/depilacion',
    icon: '✨',
    titulo: 'Depilación Definitiva',
    descripcion: 'Precios femenina y masculina · Zonas · Promos',
    color: 'border-rose-400 dark:border-rose-600',
    badge: null,
  },
  {
    href: '/admin/panel-control/precios',
    icon: '⚙️',
    titulo: 'Configuración de Servicios',
    descripcion: 'Precios · Días del mes · Uñas · Estética · Pestañas',
    color: 'border-amber-400 dark:border-amber-600',
    badge: null,
  },
  {
    href: '/admin/panel-control/promociones',
    icon: '📢',
    titulo: 'Combos y Promociones',
    descripcion: 'Crear y gestionar combos de servicios',
    color: 'border-rose-400 dark:border-rose-600',
    badge: null,
  },
  {
    href: '/admin/panel-control/contactos',
    icon: '👥',
    titulo: 'Contactos / CRM',
    descripcion: 'Clientes, visitas, pagos y señas',
    color: 'border-purple-400 dark:border-purple-600',
    badge: null,
  },
  {
    href: '/admin/panel-control/ia',
    icon: '🤖',
    titulo: 'Comunicación IA',
    descripcion: 'Activar IA, configurar prompts y respuestas',
    color: 'border-blue-400 dark:border-blue-600',
    badge: 'Activa',
  },
  {
    href: '/admin/panel-control/integraciones',
    icon: '🔗',
    titulo: 'Integraciones',
    descripcion: 'WhatsApp, Instagram, Telegram y webhooks',
    color: 'border-emerald-400 dark:border-emerald-600',
    badge: null,
  },
  {
    href: '/admin/panel-control/reportes',
    icon: '📈',
    titulo: 'Reportes',
    descripcion: 'Gráficos de turnos, ingresos y servicios',
    color: 'border-purple-400 dark:border-purple-600',
    badge: null,
  },
];

export default function PanelControlPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Panel de Control</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestión central del negocio — conectado a PostgreSQL vía n8n
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECCIONES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className={`flex flex-col gap-2 p-5 rounded-xl border-l-4 ${s.color} bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all`}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.icon}</span>
              {s.badge && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  {s.badge}
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-100">{s.titulo}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.descripcion}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
