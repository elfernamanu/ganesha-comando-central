// Pruebas del modo sin servidor + regresión con servidor simulado.
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:3201';
const OUT = '/tmp/claude-0/-home-user-ganesha-comando-central/ca1de61d-44ad-5cc9-af7e-64cecd2ac2fb/scratchpad';
const A = '2026-10-20', B = '2026-10-21';
const t = (id, h, n, sena = 0) => ({ id, horario: h, clienteNombre: n, tratamiento: '', detalle: '', asistencia: '', monto_total: 24000, extra: 0, seña_pagada: sena, estado_pago: sena ? 'seña' : 'sin_pago', metodo_pago: 'efectivo' });
const diaA = [t('a1', '10:00', 'Clienta Prueba Uno', 5000), t('a2', '10:30', 'Clienta Prueba Dos'), t('a3', '11:00', 'Clienta Prueba Tres')];
let ok = 0, fail = 0;
const check = (cond, msg) => { console.log(`${cond ? 'OK  ' : 'FALLA'} ${msg}`); cond ? ok++ : fail++; };
const ls = (page, k) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// ── 1. Servidor caído: abrir Turnos no borra la copia y la muestra ──
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`ganesha_turnos_${A}`, JSON.stringify(diaA)]);
  await page.goto(`${BASE}/admin/panel-control/turnos?fecha=${A}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  check((await ls(page, `ganesha_turnos_${A}`))?.length === 3, '1a. La copia local sigue con 3 turnos después de abrir Turnos');
  check(await page.locator('input[value="Clienta Prueba Uno"]').count() > 0, '1b. Se ven los turnos de la copia en pantalla');
  check(await page.getByText('Sin conexión con el servidor', { exact: false }).count() > 0, '1c. Aparece el aviso de trabajo sin servidor');
  await page.screenshot({ path: `${OUT}/turnos-sin-servidor.png` });

  // ── 2. Editar sin servidor se guarda en la copia ──
  const input = page.locator('input[value="Clienta Prueba Dos"]').last();
  await input.fill('Clienta Editada Sin Servidor');
  await page.waitForTimeout(1500);
  const copia = await ls(page, `ganesha_turnos_${A}`);
  check(copia?.some(x => x.clienteNombre === 'Clienta Editada Sin Servidor') && copia.length === 3, '2. Una edición sin servidor queda guardada en la copia');

  // ── 3. Cambiar de día no mezcla los turnos ──
  await page.getByRole('button', { name: /Siguiente/ }).click();
  await page.waitForTimeout(8000);
  const copiaB = await ls(page, `ganesha_turnos_${B}`);
  check(!copiaB || copiaB.length === 0, `3a. El día siguiente no recibió turnos del día anterior (tiene ${copiaB ? copiaB.length : 'nada'})`);
  check((await ls(page, `ganesha_turnos_${A}`))?.length === 3, '3b. El día anterior sigue intacto con 3 turnos');

  // ── 4. Página de copia de seguridad ──
  await page.goto(`${BASE}/admin/panel-control/copia`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  check(await page.getByText('Turnos en total').count() > 0, '4a. La página de copia carga');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.getByRole('button', { name: /Descargar copia/ }).click()]);
  const ruta = `${OUT}/${dl.suggestedFilename()}`;
  await dl.saveAs(ruta);
  const arch = JSON.parse(fs.readFileSync(ruta, 'utf8'));
  check(arch.claves?.[`ganesha_turnos_${A}`]?.length === 3, `4b. El archivo descargado (${dl.suggestedFilename()}) trae los 3 turnos`);
  await page.screenshot({ path: `${OUT}/copia-seguridad.png`, fullPage: true });
  await ctx.close();
}

// ── 5. Regresión: con servidor funcionando, manda el servidor como antes ──
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const delServidor = [t('s1', '09:00', 'Clienta Del Servidor'), t('s2', '09:30', 'Otra Del Servidor')];
  await page.route('**/api/sync?fecha=*', r => r.fulfill({ json: { ok: true, datos: delServidor, actualizado_at: '2026-10-15T10:00:00Z' } }));
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`ganesha_turnos_${A}`, JSON.stringify(diaA)]);
  await page.goto(`${BASE}/admin/panel-control/turnos?fecha=${A}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  check(await page.locator('input[value="Clienta Del Servidor"]').count() > 0, '5a. Con servidor, se muestran los turnos del servidor');
  check(await page.getByText('Sin conexión con el servidor', { exact: false }).count() === 0, '5b. Con servidor, no aparece el aviso');
  const c = await ls(page, `ganesha_turnos_${A}`);
  check(c?.length === 2 && c[0].clienteNombre === 'Clienta Del Servidor', '5c. Con servidor, la copia local se actualiza con lo del servidor');
  await ctx.close();
}

await browser.close();
console.log(`\nResultado: ${ok} OK, ${fail} FALLAS`);
