'use client';

import { useState } from 'react';

interface Servicio {
  id: number;
  nombre: string;
  duracion_minutos: number;
  precio: number;
}

interface HorarioDisponible {
  dia: string;
  inicio: string;
  fin: string;
  activo: boolean;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

interface DisponibilidadEditorProps {
  servicio: Servicio;
}

export function DisponibilidadEditor({ servicio }: DisponibilidadEditorProps) {
  const [horarios, setHorarios] = useState<HorarioDisponible[]>([
    { dia: 'Lunes', inicio: '09:00', fin: '13:00', activo: true },
    { dia: 'Miércoles', inicio: '14:00', fin: '18:00', activo: true },
    { dia: 'Viernes', inicio: '09:00', fin: '13:00', activo: true },
  ]);

  const toggleDia = (index: number) => {
    const updated = [...horarios];
    updated[index].activo = !updated[index].activo;
    setHorarios(updated);
  };

  const agregarHorario = () => {
    setHorarios([...horarios, { dia: 'Lunes', inicio: '09:00', fin: '17:00', activo: true }]);
  };

  const eliminarHorario = (index: number) => {
    setHorarios(horarios.filter((_, i) => i !== index));
  };

  const actualizarHorario = (index: number, field: string, value: string) => {
    const updated = [...horarios];
    (updated[index] as any)[field] = value;
    setHorarios(updated);
  };

  // Calcular slots disponibles
  const calcularSlots = () => {
    const slots: string[] = [];
    horarios.filter(h => h.activo).forEach(horario => {
      const [hInicio, mInicio] = horario.inicio.split(':').map(Number);
      const [hFin, mFin] = horario.fin.split(':').map(Number);

      let minutoActual = hInicio * 60 + mInicio;
      const minutoFin = hFin * 60 + mFin;

      while (minutoActual + servicio.duracion_minutos <= minutoFin) {
        const h = Math.floor(minutoActual / 60);
        const m = minutoActual % 60;
        const slot = `${horario.dia} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        slots.push(slot);
        minutoActual += servicio.duracion_minutos;
      }
    });
    return slots;
  };

  const slots = calcularSlots();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border rounded-lg p-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <h2 className="text-2xl font-bold mb-2">{servicio.nombre}</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="opacity-70">Duración</p>
            <p className="font-bold">{servicio.duracion_minutos} minutos</p>
          </div>
          <div>
            <p className="opacity-70">Precio</p>
            <p className="font-bold">${servicio.precio.toLocaleString('es-AR')}</p>
          </div>
          <div>
            <p className="opacity-70">Slots disponibles</p>
            <p className="font-bold text-green-600">{slots.length} turnos</p>
          </div>
        </div>
      </div>

      {/* Editor de horarios */}
      <div className="border rounded-lg p-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Horarios disponibles</h3>
          <button
            onClick={agregarHorario}
            className="px-4 py-2 rounded font-medium transition-colors bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 text-green-900 dark:text-green-100"
          >
            + Agregar horario
          </button>
        </div>

        <div className="space-y-3">
          {horarios.map((horario, idx) => (
            <div
              key={idx}
              className={`flex gap-4 p-4 rounded border transition-colors ${
                horario.activo
                  ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700'
                  : 'border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-600 opacity-50'
              }`}
            >
              {/* Día */}
              <select
                value={horario.dia}
                onChange={(e) => actualizarHorario(idx, 'dia', e.target.value)}
                className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                {DIAS.map((dia) => (
                  <option key={dia} value={dia}>{dia}</option>
                ))}
              </select>

              {/* Hora inicio */}
              <input
                type="time"
                value={horario.inicio}
                onChange={(e) => actualizarHorario(idx, 'inicio', e.target.value)}
                className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />

              {/* Hora fin */}
              <input
                type="time"
                value={horario.fin}
                onChange={(e) => actualizarHorario(idx, 'fin', e.target.value)}
                className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />

              {/* Toggle activo */}
              <button
                onClick={() => toggleDia(idx)}
                className={`px-3 py-2 rounded font-medium transition-colors ${
                  horario.activo
                    ? 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100'
                    : 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100'
                }`}
              >
                {horario.activo ? '✓ Activo' : '✗ Inactivo'}
              </button>

              {/* Eliminar */}
              <button
                onClick={() => eliminarHorario(idx)}
                className="px-3 py-2 rounded font-medium bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-red-600 dark:text-red-400 transition-colors"
              >
                🗑️ Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview de slots */}
      <div className="border rounded-lg p-6 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <h3 className="font-bold text-lg mb-4">Vista previa de turnos disponibles</h3>
        <div className="grid grid-cols-4 gap-2">
          {slots.length > 0 ? (
            slots.map((slot) => (
              <div
                key={slot}
                className="p-2 rounded text-center text-sm font-medium bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100"
              >
                {slot}
              </div>
            ))
          ) : (
            <p className="col-span-4 text-center opacity-70">
              No hay horarios disponibles configurados
            </p>
          )}
        </div>
      </div>

      {/* Botón guardar */}
      <div className="flex justify-end gap-2">
        <button className="px-6 py-3 rounded font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
          Cancelar
        </button>
        <button className="px-6 py-3 rounded font-bold text-white bg-blue-600 dark:bg-blue-900 hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors">
          💾 Guardar cambios
        </button>
      </div>
    </div>
  );
}
