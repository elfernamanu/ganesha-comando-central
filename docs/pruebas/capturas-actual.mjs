// Capturas de la app actual con datos de ejemplo, en celular y en PC.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:3220';
const OUT = '/tmp/claude-0/-home-user-ganesha-comando-central/ca1de61d-44ad-5cc9-af7e-64cecd2ac2fb/scratchpad/actual';
fs.mkdirSync(OUT, { recursive: true });
const F = '2026-10-16';
const nombres = ['Nadia Gallardo', 'Tamara Birk', 'María Castro', 'Silvia Ayala', 'Bernardita Urbano', 'Soledad Cisneros', 'Camila Spelzini', 'Anabela Pérez', 'Luz Zalazar', 'Gisela Danielli', 'Florencia Martorelli', 'Gonzalo Bataglia'];
const horas = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00'];
const turnos = nombres.map((n, i) => ({
  id: `t${i}`, horario: horas[i], clienteNombre: n,
  tratamiento: i % 3 === 0 ? 'PROMO DEPI 4: Axila+bozo+tira+cavado+piernas' : i % 3 === 1 ? 'PROMO DEPI 3: Cuerpo completo (Mujer)' : '',
  detalle: i === 4 ? '1168824263' : '', asistencia: i < 4 ? 'presente' : i === 5 ? 'no_vino' : '',
  monto_total: i % 3 === 2 ? 0 : 24000, extra: 0, seña_pagada: i < 3 ? 24000 : i === 3 ? 5000 : 0,
  estado_pago: i < 3 ? 'completo' : i === 3 ? 'seña' : 'sin_pago', metodo_pago: i % 2 ? 'transferencia' : 'efectivo',
}));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const tamanos = { celular: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, pc: { width: 1366, height: 820 } };

for (const [disp, vp] of Object.entries(tamanos)) {
  const { width, height, ...resto } = vp;
  const ctx = await browser.newContext({ viewport: { width, height }, ...resto });
  const page = await ctx.newPage();
  // Cargar Precios una vez deja guardado el catálogo de fábrica; después se le agregan jornadas
  await page.goto(BASE + '/admin/panel-control/precios', { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(5000);
  await page.evaluate(([F, turnos]) => {
    const cfg = JSON.parse(localStorage.getItem('ganesha_config_servicios') || '[]');
    for (const c of cfg) if (c.id === 'depilacion') c.jornadas = ['2026-10-16', '2026-10-24', '2026-10-27'].map((f, i) => ({ id: 'j' + i, fecha: f, hora_inicio: '08:00', hora_fin: '20:00', activa: true }));
    localStorage.setItem('ganesha_config_servicios', JSON.stringify(cfg));
    localStorage.setItem('ganesha_turnos_' + F, JSON.stringify(turnos));
    localStorage.setItem('ganesha_clientes_backup', JSON.stringify(turnos.slice(0, 8).map((t, i) => ({ id: 'c' + i, nombre: t.clienteNombre, celular: i % 2 ? '11' + (55550000 + i) : '', notas: i === 5 ? '⚠️ Cobrar seña — faltó turno' : '', genero: 'f' }))));
    localStorage.setItem('ganesha_copia_auto_v1', JSON.stringify({ fecha: new Date().toISOString() }));
  }, [F, turnos]);
  const pantallas = [
    ['1-inicio-agenda', '/'],
    ['2-panel', '/admin/panel-control'],
    ['3-turnos', `/admin/panel-control/turnos?fecha=${F}`],
    ['4-caja', `/admin/panel-control/caja?fecha=${F}`],
    ['5-precios', '/admin/panel-control/precios'],
    ['6-contactos', '/admin/panel-control/contactos'],
    ['7-promociones', '/admin/panel-control/promociones'],
  ];
  for (const [nombre, ruta] of pantallas) {
    await page.goto(BASE + ruta, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(7000);
    await page.screenshot({ path: `${OUT}/${disp}-${nombre}.png`, fullPage: disp === 'celular' ? false : false });
  }
  await ctx.close();
}
await browser.close();
console.log(fs.readdirSync(OUT).join('\n'));
