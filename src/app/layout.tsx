import type { Metadata } from 'next';
import { AccessibilityProvider } from '@/context/AccessibilityCtx';
import { ToastProvider } from '@/components/Toast';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Ganesha Esthetic - Comando Central',
  description: 'Terminal de control para la gestión de turnos y servicios',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ganesha Esthetic',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ganesha" />
        <meta name="theme-color" content="#4c1d95" />
      </head>
      <body className="antialiased">
        <AccessibilityProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AccessibilityProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js');
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
