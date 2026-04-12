'use client';

import { ServiceBox } from './ServiceBox';

const shiftsData = [
  {
    title: 'Box 1: Depilación',
    headerColor: 'slate' as const,
    shiftColor: 'blue' as const,
    totalShifts: 2,
    shifts: [
      { time: '09:00 - 10:30', name: 'Mariana López', service: 'Pierna entera + Axilas' },
      { time: '11:00 - 11:45', name: 'Sofía Giménez', service: 'Cavado completo' },
    ],
  },
  {
    title: 'Box 2: Uñas',
    headerColor: 'rose' as const,
    shiftColor: 'rose' as const,
    totalShifts: 1,
    shifts: [
      { time: '15:00 - 16:30', name: 'Lucía Fernández', service: 'Esculpidas / Soft Gel' },
    ],
    freeSlots: true,
  },
  {
    title: 'Box 3: Estética',
    headerColor: 'emerald' as const,
    shiftColor: 'emerald' as const,
    totalShifts: 1,
    shifts: [
      { time: '14:00 - 15:00', name: 'Camila Sosa', service: 'Himfu / Criofrecuencia' },
    ],
    freeSlots: true,
  },
  {
    title: 'Box 4: Pestañas',
    headerColor: 'purple' as const,
    shiftColor: 'purple' as const,
    totalShifts: 2,
    shifts: [
      { time: '10:00 - 11:00', name: 'Ana Martínez', service: 'Lifting + Tinte' },
      { time: '16:00 - 18:00', name: 'Julieta Ruiz', service: 'Extensiones Volumen' },
    ],
  },
];

export function ShiftsGrid() {
  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {shiftsData.map((box, idx) => (
        <ServiceBox key={idx} {...box} />
      ))}
    </div>
  );
}
