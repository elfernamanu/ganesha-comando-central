'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  isDarkMode: boolean;
  zoomLevel: number;
  toggleTheme: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mounted, setMounted] = useState(false);

  // Cargar estado del localStorage al montar
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('ganesha-dark-mode');
    const savedZoom = localStorage.getItem('ganesha-zoom-level');

    if (savedTheme) setIsDarkMode(JSON.parse(savedTheme));
    if (savedZoom) setZoomLevel(parseFloat(savedZoom));
  }, []);

  // Guardar cambios en localStorage y aplicar zoom
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('ganesha-dark-mode', JSON.stringify(isDarkMode));
      localStorage.setItem('ganesha-zoom-level', zoomLevel.toString());

      // Aplicar zoom al documento
      if (typeof document !== 'undefined') {
        document.documentElement.style.fontSize = `${16 * zoomLevel}px`;
      }
    }
  }, [isDarkMode, zoomLevel, mounted]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  const zoomIn = () => setZoomLevel(Math.min(zoomLevel + 0.1, 1.5));
  const zoomOut = () => setZoomLevel(Math.max(zoomLevel - 0.1, 0.8));

  if (!mounted) return <>{children}</>;

  return (
    <AccessibilityContext.Provider value={{ isDarkMode, zoomLevel, toggleTheme, zoomIn, zoomOut }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility debe usarse dentro de AccessibilityProvider');
  }
  return context;
}
