// Simula la PC de la dueña: copia local con turnos + servidor de base de datos caído.
import { createRequire } from 'module';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:3200';
const FECHA = '2026-10-20';
const KEY = `ganesha_turnos_${FECHA}`;
const ejemplo = [
  { id: 't1', horario: '10:00', clienteNombre: 'Clienta Prueba Uno', tratamiento: '', detalle: '', asistencia: '', monto_total: 24000, extra: 0, seña_pagada: 5000, estado_pago: 'seña', metodo_pago: 'efectivo' },
  { id: 't2', horario: '10:30', clienteNombre: 'Clienta Prueba Dos', tratamiento: '', detalle: '', asistencia: '', monto_total: 20500, extra: 0, seña_pagada: 0, estado_pago: 'sin_pago', metodo_pago: 'efectivo' },
  { id: 't3', horario: '11:00', clienteNombre: 'Clienta Prueba Tres', tratamiento: '', detalle: '', asistencia: '', monto_total: 33000, extra: 0, seña_pagada: 0, estado_pago: 'sin_pago', metodo_pago: 'efectivo' },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(ejemplo)]);
const antes = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]').length, KEY);
console.log(`Copia local ANTES de abrir Turnos: ${antes} turnos`);

await page.goto(`${BASE}/admin/panel-control/turnos?fecha=${FECHA}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(9000);
const despues = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]').length, KEY);
console.log(`Copia local DESPUÉS de abrir Turnos: ${despues} turnos`);
const visibles = await page.locator('input[value="Clienta Prueba Uno"]').count();
console.log(`¿Se ve "Clienta Prueba Uno" en pantalla?: ${visibles > 0 ? 'sí' : 'no'}`);
const aviso = await page.getByText('Sin conexión con el servidor', { exact: false }).count();
console.log(`¿Muestra aviso de modo sin servidor?: ${aviso > 0 ? 'sí' : 'no'}`);
await page.screenshot({ path: process.argv[3] || '/tmp/claude-0/-home-user-ganesha-comando-central/ca1de61d-44ad-5cc9-af7e-64cecd2ac2fb/scratchpad/turnos-offline.png', fullPage: false });
await browser.close();
