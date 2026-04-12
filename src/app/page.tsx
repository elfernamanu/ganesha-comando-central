'use client';

import { useAccessibility } from '@/context/AccessibilityCtx';
import { designTokens } from '@/config/designTokens';
import { DrawerMain } from '@/components/Drawer/DrawerMain';
import { Header } from '@/components/MainContent/Header';
import { ShiftsGrid } from '@/components/MainContent/ShiftsGrid';

export default function Home() {
  const { isDarkMode, zoomLevel } = useAccessibility();
  const theme = isDarkMode ? designTokens.dark : designTokens.light;

  return (
    <div
      className={`flex h-screen w-full ${theme.bg} ${theme.text} transition-colors duration-300`}
      style={{
        fontSize: `${zoomLevel}rem`,
      }}
    >
      <DrawerMain />
      <main className={`flex-1 p-6 md:p-10 overflow-y-auto ${theme.bg}`}>
        <Header />
        <ShiftsGrid />
      </main>
    </div>
  );
}
