'use client';

interface Shift {
  time: string;
  name: string;
  service: string;
}

interface ServiceBoxProps {
  title: string;
  icon?: string;
  colorScheme: 'slate' | 'rose' | 'emerald' | 'purple';
  shifts: Shift[];
  totalShifts: number;
  freeSlots?: boolean;
}

const HEADER: Record<string, string> = {
  slate:   'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100',
  rose:    'bg-rose-50 dark:bg-rose-900 text-rose-800 dark:text-rose-100',
  emerald: 'bg-emerald-50 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100',
  purple:  'bg-purple-50 dark:bg-purple-900 text-purple-800 dark:text-purple-100',
};

const BADGE: Record<string, string> = {
  slate:   'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
  rose:    'bg-rose-100 dark:bg-rose-800 text-rose-700 dark:text-rose-200',
  emerald: 'bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-200',
  purple:  'bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200',
};

const SHIFT: Record<string, string> = {
  slate:   'bg-slate-100 dark:bg-slate-900 border-l-4 border-slate-500 dark:border-slate-600 text-slate-800 dark:text-slate-100',
  rose:    'bg-rose-50 dark:bg-rose-900 border-l-4 border-rose-400 dark:border-rose-600 text-rose-800 dark:text-rose-100',
  emerald: 'bg-emerald-50 dark:bg-emerald-900 border-l-4 border-emerald-500 dark:border-emerald-600 text-emerald-800 dark:text-emerald-100',
  purple:  'bg-purple-50 dark:bg-purple-900 border-l-4 border-purple-400 dark:border-purple-600 text-purple-800 dark:text-purple-100',
};

export function ServiceBox({ title, colorScheme, shifts, totalShifts, freeSlots = false }: ServiceBoxProps) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col transition-colors duration-300">
      {/* Header */}
      <div className={`${HEADER[colorScheme]} p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700`}>
        <h2 className="font-bold">{title}</h2>
        <span className={`${BADGE[colorScheme]} text-xs px-2 py-1 rounded font-medium`}>
          {totalShifts} Turno{totalShifts !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Shifts */}
      <div className="p-3 flex-1 flex flex-col gap-3">
        {shifts.map((shift, idx) => (
          <div key={idx} className={`${SHIFT[colorScheme]} p-2 rounded-r`}>
            <p className="text-xs font-bold mb-1 opacity-80">{shift.time}</p>
            <p className="font-semibold text-sm">{shift.name}</p>
            <p className="text-xs opacity-70">{shift.service}</p>
          </div>
        ))}

        {freeSlots && shifts.length < 4 && (
          <div className="border border-dashed border-gray-200 dark:border-gray-700 p-3 rounded text-center">
            <p className="text-xs text-gray-400 font-medium">
              {shifts.length + 1}:00 - LIBRE
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
