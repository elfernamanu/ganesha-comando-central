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
        {/* Blanco en lugar de violeta oscuro — evita la pantalla morada al cargar */}
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="antialiased">

        {/* ── Splash: aparece ANTES que React (CSS puro, sin JS) ───────────
            El script inline lo elimina cuando el DOM está listo.            */}
        <div id="app-splash" aria-hidden="true">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '3rem', lineHeight: 1 }}>🌺</div>
            <p style={{ margin: '10px 0 4px', fontWeight: 700, color: '#1e1b4b', fontSize: '16px' }}>
              Ganesha Esthetic
            </p>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>Cargando...</p>
          </div>
          <div className="splash-spinner" />
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var el = document.getElementById('app-splash');
                if (!el) return;
                // Espera a que React monte el primer componente real
                var observer = new MutationObserver(function() {
                  var body = document.body;
                  if (body && body.children.length > 1) {
                    el.classList.add('fade-out');
                    setTimeout(function() { el.remove(); }, 260);
                    observer.disconnect();
                  }
                });
                observer.observe(document.body, { childList: true, subtree: false });
                // Fallback: quitar splash a los 5s pase lo que pase
                setTimeout(function() { el.classList.add('fade-out'); setTimeout(function(){ el.remove(); }, 260); }, 5000);
              })();
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
