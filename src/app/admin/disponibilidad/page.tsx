'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { DisponibilidadEditor } from '@/components/Admin/DisponibilidadEditor';

interface Servicio {
  id: number;
  nombre: 'Depilación' | 'Uñas' | 'Estética Corporal' | 'Pestañas';
  duracion_minutos: number;
  precio: number;
}

const SERVICIOS: Servicio[] = [
  { id: 1, nombre: 'Depilación', duracion_minutos: 30, precio: 8000 },
  { id: 2, nombre: 'Uñas', duracion_minutos: 90, precio: 15000 },
  { id: 3, nombre: 'Estética Corporal', duracion_minutos: 60, precio: 20000 },
  { id: 4, nombre: 'Pestañas', duracion_minutos: 120, precio: 18000 },
];

export default function DisponibilidadPage() {
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio>(SERVICIOS[0]);

  return (
    <div className="grid grid-cols-4 gap-6">
      {/* Sidebar con servicios */}
      <div className="col-span-1 border rounded-lg p-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <h2 className="font-bold mb-4">Servicios</h2>
        <div className="space-y-2">
          {SERVICIOS.map((svc) => (
            <button
              key={svc.id}
              onClick={() => setServicioSeleccionado(svc)}
              className={`w-full text-left p-3 rounded transition-colors ${
                servicioSeleccionado.id === svc.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <p className="font-medium">{svc.nombre}</p>
              <p className="text-xs opacity-70">{svc.duracion_minutos} min</p>
            </button>
          ))}
        </div>
      </div>

      {/* Editor principal */}
      <div className="col-span-3">
        <DisponibilidadEditor servicio={servicioSeleccionado} />
      </div>
    </div>
  );
}
