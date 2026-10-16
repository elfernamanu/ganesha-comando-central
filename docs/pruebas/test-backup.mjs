// Backup completo: servidor + PC, teléfonos dentro de turnos, contacto borrado, y restauración en base vacía.
import { createRequire } from 'module';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const APP = '/home/user/ganesha-comando-central';
const OUT = '/tmp/claude-0/-home-user-ganesha-comando-central/ca1de61d-44ad-5cc9-af7e-64cecd2ac2fb/scratchpad/backup-prueba';
fs.mkdirSync(OUT, { recursive: true });
const sql = (db, q) => execSync(`psql -h /tmp -p 5433 -U pgtest -d ${db} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
let ok = 0, fail = 0;
const check = (c, m) => { console.log(`${c ? 'OK  ' : 'FALLA'} ${m}`); c ? ok++ : fail++; };
const espera = ms => new Promise(r => setTimeout(r, ms));
const servidores = [];
async function arrancar(port, db) {
  const env = { ...process.env, DATABASE_URL: `postgresql://app_clave:[Ab#12@xy/9?z:%Q]@localhost:5433/${db}` };
  delete env.POSTGRES_URL;
  const p = spawn('npx', ['next', 'start', '-p', String(port)], { cwd: APP, env, detached: true, stdio: 'ignore' });
  servidores.push(p);
  for (let i = 0; i < 40; i++) { try { await fetch(`http://localhost:${port}/api/health`); return `http://localhost:${port}`; } catch { await espera(500); } }
  throw new Error('no arrancó');
}
const importar = async (base, claves) => {
  await fetch(base + '/api/admin/instalar', { method: 'POST' });
  return (await fetch(base + '/api/admin/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claves }) })).json();
};

const A = '2026-10-20', B = '2026-10-24';
const t = (id, h, n, extra = {}) => ({ id, horario: h, clienteNombre: n, tratamiento: '', detalle: '', asistencia: '', monto_total: 24000, extra: 0, seña_pagada: 0, estado_pago: 'sin_pago', metodo_pago: 'efectivo', ...extra });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
try {
  const BASE = await arrancar(3208, 'ganesha6');

  // El servidor ya tiene datos que subió otro dispositivo (incluye un celular anotado en el detalle)
  const r0 = await importar(BASE, {
    [`ganesha_turnos_${A}`]: [t('a1', '10:00', 'Ana Gomez'), t('a4', '12:00', 'Flor Lima'), t('a5', '13:00', 'Gina Sol', { detalle: '11 5555-0077' })],
    ganesha_clientes_backup: [{ id: 'z9', nombre: 'Flor Lima', celular: '1155550009', notas: 'Clienta VIP', genero: 'f' }],
  });
  check(JSON.parse(sql('ganesha6', "select datos from clientes_telefonos where id=1")).some(c => c.nombre === 'Gina Sol' && c.celular === '1155550077'),
    `0. El servidor rescató el celular anotado en el detalle de un turno (Gina Sol) — contactos agregados: ${r0.resumen.contactosAgregados}`);

  // La PC de la dueña (con la copia automática ya hecha, para probar solo el backup)
  const pc = {
    [`ganesha_turnos_${A}`]: [t('a1', '10:00', 'Ana Gomez', { tratamiento: 'PROMO DEPI 4', asistencia: 'presente', seña_pagada: 24000, estado_pago: 'completo', metodo_pago: 'transferencia' }), t('a2', '10:30', 'Bea Diaz', { detalle: 'cel hija 11 4444-0002' }), t('a3', '11:00', 'Caro Ruiz', { asistencia: 'no_vino', detalle: '11 5555-0003' })],
    [`ganesha_turnos_${B}`]: [t('b1', '09:00', 'Dana Paz'), t('b2', '09:30', 'Eva Sol', { detalle: '1155550001' }), t('b3', '10:00', 'Zulma Vieja')],
    ganesha_clientes_backup: [{ id: 'c1', nombre: 'Ana Gomez', celular: '1155550001', notas: '', genero: 'f' }, { id: 'c2', nombre: 'Bea Diaz', celular: '', notas: '', genero: 'f' }],
    ganesha_clientes_borrados: ['zulma vieja'],
    ganesha_config_servicios: [{ id: 'depilacion', nombre: 'Depilación', icon: '✨', activo: true, jornadas: [{ id: 'j1', fecha: '2026-10-27', hora_inicio: '08:00', hora_fin: '20:00', activa: true }], subservicios: [{ id: 2, nombre: 'Axilas', precio: 18000, activo: true }, { id: 3, nombre: 'PROMO DEPI 4', precio: 24000, activo: true }] }],
    ganesha_catalog_combos_raw: [{ numero: 1, nombre: 'Combo Verano', descripcion: 'Depi + uñas', precio: 50000, activo: true }],
    ganesha_gastos_fijos_empresa_v2: [{ id: 'g1', nombre: 'Alquiler del local', montoTotal: 300000, activo: true }],
    ganesha_gastos_fijos_personal_v2: [{ id: 'p1', nombre: 'Cuota del auto', montoTotal: 123456, activo: true }],
    [`ganesha_gastos_${A}`]: [{ id: 'x1', concepto: 'Cera', monto: 15000 }],
    ganesha_copia_auto_v1: { fecha: '2026-10-15T00:00:00Z' },
  };
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(d => { for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); }, pc);
  await page.goto(BASE + '/admin/panel-control/copia', { waitUntil: 'domcontentloaded' });
  await page.getByText('Datos de: servidor + este dispositivo', { exact: false }).last().waitFor({ timeout: 20000 });
  const linea = await page.locator('p', { hasText: 'Datos de: servidor + este dispositivo' }).last().innerText();
  check(linea.includes('7 clientes · 6 con celular · 4 listos para WhatsApp · 2 números a revisar') && linea.includes('8 turnos en 2 días'), `1. Resumen en pantalla: "${linea.replace(/\s+/g, ' ')}"`);
  await page.screenshot({ path: `${OUT}/pantalla-backup.png`, fullPage: true });

  const bajar = async (texto) => {
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: new RegExp(texto) }).last().click()]);
    const ruta = `${OUT}/${dl.suggestedFilename()}`; await dl.saveAs(ruta); return ruta;
  };
  const html = fs.readFileSync(await bajar('Documento completo'), 'utf8');
  const csvCli = fs.readFileSync(await bajar('Clientes y teléfonos'), 'utf8');
  const csvTur = fs.readFileSync(await bajar('Todos los turnos'), 'utf8');
  const restaurar = JSON.parse(fs.readFileSync(await bajar('Archivo para restaurar'), 'utf8'));

  const clientesHtml = html.split('id="servicios"')[0];
  check(['Ana Gomez', 'Bea Diaz', 'Caro Ruiz', 'Dana Paz', 'Eva Sol', 'Flor Lima', 'Gina Sol'].every(n => clientesHtml.includes(n)) && !clientesHtml.includes('Zulma'),
    '2a. Documento: los 7 clientes de todas las fuentes; la clienta borrada por la dueña no figura en la lista de clientes');
  check(clientesHtml.includes('1155550003') && clientesHtml.includes('1155550077') && clientesHtml.includes('1155550009') && clientesHtml.includes('Clienta VIP'),
    '2b. Documento: celulares sacados de los turnos (Caro, Gina), del servidor (Flor) y sus notas');
  check(html.includes('Axilas') && html.includes('$18.000') && html.includes('27/10/2026 08:00–20:00') && html.includes('Combo Verano') && html.includes('$50.000'),
    '2c. Documento: servicios, precios, jornadas y combos');
  check(html.includes('Zulma Vieja') && html.includes('Transferencia') && html.includes('No vino') && html.includes('Cera') && html.includes('Cuota del auto') && html.includes('Alquiler del local'),
    '2d. Documento: todos los turnos (incluido el de la clienta borrada), cobros, faltas, gastos de caja y gastos fijos');
  const filasCli = csvCli.replace(/^﻿/, '').split('\r\n');
  check(csvCli.startsWith('﻿') && filasCli.length === 8 && filasCli.some(f => f.includes('"Caro Ruiz";"=""1155550003"""')),
    `2e. Excel de clientes: 7 filas + encabezado, celulares protegidos como texto (${filasCli[0].slice(0, 40)}…)`);
  check(filasCli.some(f => f.startsWith(String.raw`"Bea Diaz";"=""1144440002""";"=""+5491144440002"""`)), "2h. Excel: el celular escrito dentro de un texto (cel hija 11 4444-0002) quedó listo para WhatsApp");
  check(filasCli.some(f => f.startsWith(String.raw`"Eva Sol"`) && f.includes("mismo número que Ana Gomez")), "2i. Excel: avisa que Eva y Ana tienen el mismo número");
  const filasTur = csvTur.replace(/^﻿/, '').split('\r\n');
  check(filasTur.length === 9 && filasTur.some(f => f.startsWith('"20/10/2026";"10:00";"Ana Gomez";"PROMO DEPI 4"') && f.includes('"Vino"') && f.includes('"Transferencia"')),
    '2f. Excel de turnos: 8 turnos; el de Ana combinado (servicio, asistencia y cobro por transferencia)');
  check(restaurar.app === 'ganesha-comando-central' && Object.keys(restaurar.claves).filter(k => k.startsWith('ganesha_turnos_')).length === 2,
    '2g. Archivo para restaurar: formato que la app acepta, con los 2 días');
  await ctx.close();

  // Restauración en una base vacía, solo con el archivo
  const BASE2 = await arrancar(3209, 'ganesha7');
  const r = await importar(BASE2, restaurar.claves);
  check(r.ok, '3a. El archivo se carga en una base nueva y vacía');
  const diaA = JSON.parse(sql('ganesha7', `select datos from turnos where fecha='${A}'`));
  check(diaA.length === 5 && sql('ganesha7', "select sum(jsonb_array_length(datos)) from turnos") === '8', '3b. Restaurados los 8 turnos en 2 días');
  const a1 = diaA.find(x => x.id === 'a1');
  check(a1.estado_pago === 'completo' && a1.metodo_pago === 'transferencia' && a1.asistencia === 'presente', '3c. El turno de Ana vuelve cobrado, por transferencia y con asistencia');
  const cont = JSON.parse(sql('ganesha7', "select datos from clientes_telefonos where id=1"));
  check(['Ana Gomez', 'Bea Diaz', 'Caro Ruiz', 'Flor Lima', 'Gina Sol'].every(n => cont.some(c => c.nombre === n)) && cont.find(c => c.nombre === 'Caro Ruiz')?.celular === '1155550003',
    `3d. Restaurados los contactos con celular o ficha (${cont.length}), incluidos los celulares sacados de los turnos`);
  check(sql('ganesha7', "select string_agg(id::text, ',' order by id) from config_servicios") === '-4,-3,-2,-1,1', '3e. Restaurados servicios y precios, combos y gastos fijos');
  check(sql('ganesha7', `select datos->'gastos'->0->>'concepto' from caja_diaria where fecha='${A}'`) === 'Cera', '3f. Restaurado el gasto de caja');
} finally {
  for (const p of servidores) { try { process.kill(-p.pid, 'SIGTERM'); } catch {} }
  await browser.close();
}
console.log(`\nResultado: ${ok} OK, ${fail} FALLAS`);
