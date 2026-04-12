'use client';

import { useAccessibility } from '@/context/AccessibilityCtx';

export function ThemeZoomControls() {
  const { isDarkMode, toggleTheme, zoomIn, zoomOut } = useAccessibility();

  return (
    <div className="flex gap-2 mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
      <button
        onClick={toggleTheme}
        className="p-2 rounded text-sm font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {isDarkMode ? '☀️ Claro' : '🌙 Oscuro'}
      </button>
      <button
        onClick={zoomOut}
        className="p-2 rounded text-sm font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        A-
      </button>
      <button
        onClick={zoomIn}
        className="p-2 rounded text-sm font-medium border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        A+
      </button>
    </div>
  );
}
