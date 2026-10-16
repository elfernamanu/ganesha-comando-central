// Edición sin servidor y después vuelve el servidor (con datos más viejos).
import { createRequire } from 'module';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:3201';
const A = '2026-10-20';
const t = (id, h, n) => ({ id, horario: h, clienteNombre: n, tratamiento: '', detalle: '', asistencia: '', monto_total: 24000, extra: 0, seña_pagada: 0, estado_pago: 'sin_pago', metodo_pago: 'efectivo' });
const viejos = [t('a1', '10:00', 'Clienta Prueba Uno'), t('a2', '10:30', 'Clienta Prueba Dos'), t('a3', '11:00', 'Clienta Prueba Tres')];
let ok = 0, fail = 0;
const check = (c, m) => { console.log(`${c ? 'OK  ' : 'FALLA'} ${m}`); c ? ok++ : fail++; };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`ganesha_turnos_${A}`, JSON.stringify(viejos)]);
await page.goto(`${BASE}/admin/panel-control/turnos?fecha=${A}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

// Sin servidor: editar un nombre
await page.locator('input[value="Clienta Prueba Dos"]').last().fill('Editada Sin Servidor');
await page.waitForTimeout(1000);

// Vuelve el servidor, con los datos viejos (sin la edición)
const posts = [];
await page.route('**/api/sync**', async r => {
  if (r.request().method() === 'POST') { posts.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ json: { ok: true } }); }
  return r.fulfill({ json: { ok: true, datos: viejos, actualizado_at: '2026-10-15T10:00:00Z' } });
});
await page.evaluate(() => window.dispatchEvent(new Event('focus')));
await page.waitForTimeout(11000);

check(await page.locator('input[value="Editada Sin Servidor"]').count() > 0, 'La edición hecha sin servidor sigue en pantalla');
const local = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '[]'), `ganesha_turnos_${A}`);
check(local.some(x => x.clienteNombre === 'Editada Sin Servidor'), 'La edición sigue en la copia local');
check(posts.some(p => p.datos?.some(x => x.clienteNombre === 'Editada Sin Servidor')), `La edición se mandó sola al servidor (${posts.length} envíos)`);
check(await page.getByText('Sin conexión con el servidor', { exact: false }).count() === 0, 'El aviso desaparece cuando vuelve el servidor');

await browser.close();
console.log(`\nResultado: ${ok} OK, ${fail} FALLAS`);
