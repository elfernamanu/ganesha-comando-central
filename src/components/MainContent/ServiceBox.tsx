'use client';

import { useAccessibility } from '@/context/AccessibilityCtx';
import { designTokens } from '@/config/designTokens';

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

export function ServiceBox({
  title,
  colorScheme,
  shifts,
  totalShifts,
  freeSlots = false,
}: ServiceBoxProps) {
  const { isDarkMode } = useAccessibility();
  const colors = designTokens.colors[colorScheme];
  const theme = isDarkMode ? designTokens.dark : designTokens.light;

  const headerClass = isDarkMode
    ? `bg-${colorScheme}-900 border-b ${designTokens.dark.border}`
    : colors.header;
  const badgeClass = isDarkMode
    ? `bg-${colorScheme}-800 text-${colorScheme}-200`
    : colors.badge;
  const shiftClass = isDarkMode ? colors.dark : colors.light;

  return (
    <div
      className={`bg-white border ${theme.border} rounded-lg shadow-sm overflow-hidden flex flex-col transition-colors duration-300 ${isDarkMode ? `dark-${colorScheme}` : ''}`}
      style={
        isDarkMode
          ? {
              backgroundColor: 'rgb(17, 24, 39)',
              borderColor: 'rgb(55, 65, 81)',
            }
          : {}
      }
    >
      {/* Header */}
      <div className={`${headerClass} p-3 flex justify-between items-center`}>
        <h2 className="font-bold">{title}</h2>
        <span className={`${badgeClass} text-xs px-2 py-1 rounded font-medium`}>
          {totalShifts} Turno{totalShifts !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Shifts */}
      <div className="p-3 flex-1 flex flex-col gap-3">
        {shifts.map((shift, idx) => (
          <div key={idx} className={`${shiftClass} p-2 rounded-r`}>
            <p className="text-xs font-bold mb-1 opacity-80">{shift.time}</p>
            <p className="font-semibold text-sm">{shift.name}</p>
            <p className="text-xs opacity-70">{shift.service}</p>
          </div>
        ))}

        {/* Free slot indicator */}
        {freeSlots && shifts.length < 4 && (
          <div className={`border border-dashed ${theme.border} p-3 rounded text-center`}>
            <p className="text-xs text-gray-400 font-medium">
              {shifts.length + 1}:00 - LIBRE
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
