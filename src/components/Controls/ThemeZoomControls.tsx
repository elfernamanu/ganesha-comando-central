'use client';

import { useAccessibility } from '@/context/AccessibilityCtx';
import { designTokens } from '@/config/designTokens';

export function ThemeZoomControls() {
  const { isDarkMode, toggleTheme, zoomIn, zoomOut } = useAccessibility();
  const theme = isDarkMode ? designTokens.dark : designTokens.light;

  return (
    <div className={`flex gap-2 mb-8 pb-4 border-b ${theme.border}`}>
      <button
        onClick={toggleTheme}
        className={`p-2 rounded text-sm font-medium border ${theme.border} transition-colors ${theme.hover}`}
      >
        {isDarkMode ? '☀️ Claro' : '🌙 Oscuro'}
      </button>
      <button
        onClick={zoomOut}
        className={`p-2 rounded text-sm font-medium border ${theme.border} transition-colors ${theme.hover}`}
      >
        A-
      </button>
      <button
        onClick={zoomIn}
        className={`p-2 rounded text-sm font-medium border ${theme.border} transition-colors ${theme.hover}`}
      >
        A+
      </button>
    </div>
  );
}
