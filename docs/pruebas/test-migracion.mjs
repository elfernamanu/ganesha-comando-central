// Migración completa a una base nueva: PC de la dueña + celular de la secretaria.
import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:3202';
const OUT = '/tmp/claude-0/-home-user-ganesha-comando-central/ca1de61d-44ad-5cc9-af7e-64cecd2ac2fb/scratchpad';
const sql = q => execSync(`psql -h localhost -p 5433 -U pgtest -d ganesha -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
let ok = 0, fail = 0;
const check = (c, m) => { console.log(`${c ? 'OK  ' : 'FALLA'} ${m}`); c ? ok++ : fail++; };

const A = '2026-10-20', B = '2026-10-24';
const t = (id, h, n, extra = {}) => ({ id, horario: h, clienteNombre: n, tratamiento: '', detalle: '', asistencia: '', monto_total: 24000, extra: 0, seña_pagada: 0, estado_pago: 'sin_pago', metodo_pago: 'efectivo', ...extra });
const pc = {
  [`ganesha_turnos_${A}`]: [t('a1', '10:00', 'Ana Gomez', { asistencia: 'presente', seña_pagada: 24000, estado_pago: 'completo' }), t('a2', '10:30', 'Bea Diaz'), t('a3', '11:00', 'Caro Ruiz')],
  [`ganesha_turnos_${B}`]: [t('b1', '09:00', 'Dana Paz'), t('b2', '09:30', 'Eva Sol')],
  ganesha_clientes_backup: [{ id: 'c1', nombre: 'Ana Gomez', celular: '1155550001', notas: '', genero: 'f' }, { id: 'c2', nombre: 'Bea Diaz', celular: '', notas: '', genero: 'f' }, { id: 'c3', nombre: 'Caro Ruiz', celular: '1155550003', notas: '', genero: 'f' }],
  ganesha_config_servicios: [{ id: 'unas', nombre: 'Uñas', subservicios: [{ id: 1, nombre: 'Esmaltado', precio: 10000 }] }, { id: 'depilacion', nombre: 'Depilación', subservicios: [{ id: 2, nombre: 'Axilas', precio: 18000 }] }, { id: 'estetica', nombre: 'Estética', subservicios: [{ id: 3, nombre: 'Limpieza', precio: 25000 }] }],
  ganesha_config_v5: 'ok',
  ganesha_catalog_combos_raw: [{ id: 'k1', nombre: 'Combo Verano', precio: 50000 }],
  ganesha_gastos_fijos_empresa_v2: [{ id: 'g1', nombre: 'Alquiler', monto: 300000 }],
  [`ganesha_gastos_${A}`]: [{ id: 'x1', concepto: 'Cera', monto: 15000 }],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// ── 1. Base nueva vacía ──
const est0 = await (await fetch(`${BASE}/api/admin/instalar`)).json();
check(est0.conectado === true && est0.faltan.length === 7, `1. La app se conecta a la base nueva y detecta que faltan las 7 tablas`);

// ── 2. PC de la dueña sube su copia ──
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(d => { for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, pc);
  await page.goto(`${BASE}/admin/panel-control/copia`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Servidor conectado').last().waitFor({ timeout: 15000 });
  check(await page.getByText('Base de datos nueva y vacía').count() > 0, '2a. La pantalla de copia muestra el servidor conectado y vacío');
  await page.getByRole('button', { name: /Subir esta copia al servidor/ }).last().click();
  await page.getByText('No se borró nada del servidor').last().waitFor({ timeout: 20000 });
  check(await page.getByText('Turnos: 5 agregados (2 días nuevos', { exact: false }).count() > 0, '2b. Se informan 5 turnos en 2 días nuevos');
  await page.screenshot({ path: `${OUT}/copia-subida.png`, fullPage: true });
  await page.close();
}
check(sql("select count(*) from turnos") === '2' && sql("select sum(jsonb_array_length(datos)) from turnos") === '5', '2c. En la base: 2 días y 5 turnos');
check(sql("select jsonb_array_length(datos) from clientes_telefonos where id=1") === '3', '2d. En la base: 3 contactos');
check(sql("select string_agg(id::text, ',' order by id) from config_servicios") === '-4,-3,-1,1', '2e. En la base: precios, combos, gastos fijos y espejo de contactos');
check(sql("select datos->'gastos'->0->>'concepto' from caja_diaria where fecha='2026-10-20'") === 'Cera', '2f. En la base: el gasto de caja del día');

// ── 3. Celular de la secretaria: archivo con un turno repetido (cambiado) y uno nuevo ──
const celu = {
  app: 'ganesha-comando-central', tipo: 'copia-dispositivo', version: 1,
  claves: {
    [`ganesha_turnos_${A}`]: [t('a1', '10:00', 'Ana Gomez CAMBIADO'), t('a4', '12:00', 'Flor Lima')],
    ganesha_clientes_backup: [{ id: 'z2', nombre: 'bea diaz', celular: '1155550002', notas: '', genero: 'f' }, { id: 'z9', nombre: 'Flor Lima', celular: '1155550009', notas: '', genero: 'f' }],
  },
};
fs.writeFileSync(`${OUT}/GANESHA_COPIA_celular.json`, JSON.stringify(celu));
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(`${BASE}/admin/panel-control/copia`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Servidor conectado').last().waitFor({ timeout: 15000 });
  await page.locator('#archivo-copia').last().setInputFiles(`${OUT}/GANESHA_COPIA_celular.json`);
  await page.getByText('No se borró nada del servidor').last().waitFor({ timeout: 20000 });
  await page.close();
}
const diaA = JSON.parse(sql(`select datos from turnos where fecha='${A}'`));
check(diaA.length === 4, `3a. El día ${A} quedó con 4 turnos (3 de la PC + 1 nuevo del celular)`);
check(diaA.find(x => x.id === 'a1')?.clienteNombre === 'Ana Gomez' && diaA.find(x => x.id === 'a1')?.estado_pago === 'completo', '3b. El turno repetido NO se pisó: quedó el de la PC, cobrado');
const cont = JSON.parse(sql("select datos from clientes_telefonos where id=1"));
check(cont.length === 4 && cont.find(c => c.nombre === 'Bea Diaz')?.celular === '1155550002', '3c. Contactos: se agregó Flor y se completó el celular vacío de Bea');
check(Number(sql("select count(*) from backups_previos")) >= 2, '3d. Antes de modificar se guardaron respaldos');

// ── 4. Volver a subir lo mismo no duplica nada ──
const re = await (await fetch(`${BASE}/api/admin/importar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claves: pc }) })).json();
check(re.ok && re.resumen.turnosAgregados === 0 && re.resumen.contactosAgregados === 0 && re.resumen.precios.startsWith('ya estaban'), '4. Subir la misma copia otra vez no duplica ni pisa nada');
const inst2 = await (await fetch(`${BASE}/api/admin/instalar`, { method: 'POST' })).json();
check(inst2.ok && sql("select sum(jsonb_array_length(datos)) from turnos") === '6', '5. Reinstalar las tablas no borra datos');

// ── 6. La app funciona normal con la base nueva, desde un dispositivo sin copia ──
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto(`${BASE}/admin/panel-control/turnos?fecha=${A}`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[value="Flor Lima"]').last().waitFor({ timeout: 15000 });
  check(await page.getByText('Sin conexión con el servidor', { exact: false }).count() === 0, '6a. Turnos carga desde la base nueva, sin aviso de modo local');
  await page.locator('input[value="Bea Diaz"]').last().fill('Bea Diaz Editada');
  await page.waitForTimeout(11000);
  check(sql(`select datos::text from turnos where fecha='${A}'`).includes('Bea Diaz Editada'), '6b. Una edición se guarda sola en la base nueva');
  await page.screenshot({ path: `${OUT}/turnos-base-nueva.png` });

  await page.goto(`${BASE}/admin/panel-control/contactos`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  check(await page.getByText('Flor Lima').count() > 0, '6c. Contactos muestra los datos de la base nueva');

  const caja = await (await fetch(`${BASE}/api/caja?fecha=${A}`)).json();
  check(caja.ok && caja.gastos?.[0]?.concepto === 'Cera', '6d. Caja lee el gasto del día desde la base nueva');
  const cfg = await (await fetch(`${BASE}/api/admin/config`)).json();
  check(cfg.ok && cfg.datos?.length === 3, '6e. Precios se leen desde la base nueva');
  const stats = await (await fetch(`${BASE}/api/clientes/stats`)).json();
  check(stats.ok && stats.stats?.['Ana Gomez']?.presentes === 1, '6f. El historial de asistencias se calcula desde la base nueva');
  await page.close();
}

await browser.close();
console.log(`\nResultado: ${ok} OK, ${fail} FALLAS`);
