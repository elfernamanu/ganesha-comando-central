import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * WEB APAGADA (pedido del técnico).
 *
 * Toda la web (páginas y API) responde con un aviso de "apagada".
 * No se borra nada: la base de datos queda intacta y la copia guardada
 * en cada navegador (PC de la dueña) no se toca, porque esta página
 * no ejecuta ningún script.
 *
 * Única excepción: el aviso diario de Vercel a /api/health, para que la
 * base gratuita de Supabase no se pause por inactividad.
 *
 * PARA ENCENDER LA WEB DE NUEVO: borrar este archivo y publicar.
 */

const PAGINA = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Ganesha Esthetic</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#F5F4F7;color:#1E1A22;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;padding:16px;box-sizing:border-box}
  .caja{background:#fff;border:1px solid #E8E4EC;border-radius:18px;padding:28px 24px;max-width:380px;text-align:center}
  h1{margin:0 0 8px;font-size:22px;color:#6B2D5C}
  p{margin:0;font-size:16px;line-height:1.5;color:#3B3540}
  @media (prefers-color-scheme: dark){
    body{background:#151217;color:#F2EEF5}
    .caja{background:#1F1B23;border-color:#332D38}
    h1{color:#E2B6D6}
    p{color:#CFC7D6}
  }
</style>
</head>
<body>
  <div class="caja">
    <h1>Ganesha Esthetic</h1>
    <p>La aplicación está apagada por mantenimiento.<br>Los datos están guardados.</p>
  </div>
</body>
</html>`;

export function proxy(request: NextRequest) {
  const agente = request.headers.get('user-agent') || '';
  if (request.nextUrl.pathname === '/api/health' && agente.startsWith('vercel-cron')) {
    return NextResponse.next();
  }

  return new NextResponse(PAGINA, {
    status: 503,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '86400',
    },
  });
}
