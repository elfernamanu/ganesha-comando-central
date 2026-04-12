import type { Metadata } from 'next';
import { AccessibilityProvider } from '@/context/AccessibilityCtx';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Ganesha Esthetic - Comando Central',
  description: 'Terminal de control para la gestión de turnos y servicios',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="transition-colors duration-300">
        <AccessibilityProvider>{children}</AccessibilityProvider>
      </body>
    </html>
  );
}
