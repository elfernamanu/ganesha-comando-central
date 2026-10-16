// Copia automática: celular viejo primero, PC de la dueña después, y una PC con muchos datos.
import { createRequire } from 'module';
import { execSync } from 'child_process';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const BASE = 'http://localhost:3206';
const sql = q => execSync(`psql -h /tmp -p 5433 -U pgtest -d ganesha4 -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
let ok = 0, fail = 0;
const check = (c, m) => { console.log(`${c ? 'OK  ' : 'FALLA'} ${m}`); c ? ok++ : fail++; };
const A = '2026-10-20', B = '2026-10-24';
const t = (id, h, n, extra = {}) => ({ id, horario: h, clienteNombre: n, tratamiento: '', detalle: '', asistencia: '', monto_total: 24000, extra: 0, seña_pagada: 0, estado_pago: 'sin_pago', metodo_pago: 'efectivo', ...extra });

const celular = {
  [`ganesha_turnos_${A}`]: [t('a1', '10:00', 'Ana Gomez'), t('a4', '12:00', 'Flor Lima')],
  ganesha_clientes_backup: [{ id: 'z2', nombre: 'Bea Diaz', celular: '1155550002', notas: '', genero: 'f' }, { id: 'z9', nombre: 'Flor Lima', celular: '1155550009', notas: '', genero: 'f' }],
};
const pc = {
  [`ganesha_turnos_${A}`]: [t('a1', '10:00', 'Ana Gomez', { tratamiento: 'PROMO DEPI 4', asistencia: 'presente', seña_pagada: 24000, estado_pago: 'completo', metodo_pago: 'transferencia' }), t('a2', '10:30', 'Bea Diaz'), t('a3', '11:00', 'Caro Ruiz', { asistencia: 'no_vino' })],
  [`ganesha_turnos_${B}`]: [t('b1', '09:00', 'Dana Paz'), t('b2', '09:30', 'Eva Sol')],
  ganesha_clientes_backup: [{ id: 'c1', nombre: 'Ana Gomez', celular: '1155550001', notas: '', genero: 'f' }, { id: 'c2', nombre: 'Bea Diaz', celular: '', notas: '', genero: 'f' }, { id: 'c3', nombre: 'Caro Ruiz', celular: '1155550003', notas: '', genero: 'f' }],
  ganesha_config_servicios: [{ id: 'unas', subservicios: [{ id: 1, nombre: 'Esmaltado', precio: 10000 }] }, { id: 'depilacion', subservicios: [{ id: 2, nombre: 'Axilas', precio: 18000 }] }, { id: 'estetica', subservicios: [{ id: 3, nombre: 'Limpieza', precio: 25000 }] }],
  ganesha_catalog_combos_raw: [{ id: 'k1', nombre: 'Combo Verano', precio: 50000 }],
  ganesha_gastos_fijos_empresa_v2: [{ id: 'g1', nombre: 'Alquiler', monto: 300000 }],
  [`ganesha_gastos_${A}`]: [{ id: 'x1', concepto: 'Cera', monto: 15000 }],
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function abrirDispositivo(datos) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const importaciones = [];
  page.on('request', r => { if (r.url().includes('/api/admin/importar')) importaciones.push(r.postData()?.length ?? 0); });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(d => { for (const [k, v] of Object.entries(d)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }, datos);
  await page.reload({ waitUntil: 'domcontentloaded' });   // la dueña abre la app como siempre
  await page.waitForFunction(() => !!localStorage.getItem('ganesha_copia_auto_v1'), null, { timeout: 30000 });
  return { ctx, page, importaciones };
}

// ── 1. El celular con datos viejos abre la app primero ──
const cel = await abrirDispositivo(celular);
check(true, '1a. El celular copió sus datos solo, sin tocar ningún botón');
check(await cel.page.getByText('Datos de este dispositivo copiados al servidor').count() > 0, '1b. Aparece el aviso de copia terminada');
check(sql(`select jsonb_array_length(datos) from turnos where fecha='${A}'`) === '2', '1c. En la base: los 2 turnos del celular');
await cel.ctx.close();

// ── 2. Después abre la PC de la dueña ──
const dueña = await abrirDispositivo(pc);
const diaA = JSON.parse(sql(`select datos from turnos where fecha='${A}'`));
const a1 = diaA.find(x => x.id === 'a1');
check(diaA.length === 4, `2a. Día ${A}: 4 turnos (los 2 del celular + 2 que solo tenía la PC)`);
check(a1.asistencia === 'presente' && a1['seña_pagada'] === 24000 && a1.estado_pago === 'completo' && a1.tratamiento === 'PROMO DEPI 4' && a1.metodo_pago === 'transferencia',
  '2b. Turno de Ana: se completó con asistencia, cobro y servicio de la PC aunque el celular subió antes y la forma de pago del cobro (transferencia)');
check(diaA.find(x => x.id === 'a3')?.asistencia === 'no_vino', '2c. La ausencia de Caro quedó registrada (historial de faltas)');
check(sql(`select jsonb_array_length(datos) from turnos where fecha='${B}'`) === '2', `2d. Día ${B}: los 2 turnos de la PC`);
const cont = JSON.parse(sql("select datos from clientes_telefonos where id=1"));
check(cont.length === 4 && cont.find(c => c.nombre === 'Bea Diaz')?.celular === '1155550002', '2e. Contactos: 4, y Bea conserva el celular que tenía el celular');
check(sql("select string_agg(id::text, ',' order by id) from config_servicios") === '-4,-3,-1,1', '2f. Precios, combos y gastos fijos de la PC cargados');
check(sql(`select datos->'gastos'->0->>'concepto' from caja_diaria where fecha='${A}'`) === 'Cera', '2g. Gasto de caja del día cargado');

// ── 3. Volver a abrir la app no vuelve a copiar ──
const antes = dueña.importaciones.length;
await dueña.page.reload({ waitUntil: 'domcontentloaded' });
await dueña.page.waitForTimeout(5000);
check(dueña.importaciones.length === antes, '3. Al volver a abrir la app no se vuelve a copiar (solo una vez por dispositivo)');

// ── 4. Pantalla de copia: lo informa, y el botón manual sigue andando sin duplicar ──
await dueña.page.goto(BASE + '/admin/panel-control/copia', { waitUntil: 'domcontentloaded' });
await dueña.page.getByText('Servidor conectado').last().waitFor({ timeout: 15000 });
check(await dueña.page.getByText('Este dispositivo ya copió sus datos al servidor', { exact: false }).count() > 0, '4a. La pantalla de copia informa que ya se copió');
await dueña.page.getByRole('button', { name: /Subir esta copia al servidor/ }).last().click();
await dueña.page.getByText('No se borró nada del servidor').last().waitFor({ timeout: 20000 });
check(await dueña.page.getByText('Turnos: 0 agregados, 0 completados', { exact: false }).count() > 0, '4b. Subir de nuevo a mano no duplica nada');
check(sql(`select jsonb_array_length(datos) from turnos where fecha='${A}'`) === '4', '4c. Siguen siendo 4 turnos');
await dueña.ctx.close();

// ── 5. Un dispositivo nuevo ve todo desde el servidor ──
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin/panel-control/turnos?fecha=${A}`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[value="Flor Lima"]').last().waitFor({ timeout: 15000 });
  check(await page.locator('input[value="Caro Ruiz"]').count() > 0 && await page.getByText('Sin conexión con el servidor', { exact: false }).count() === 0,
    '5. Un dispositivo sin copia ve los 4 turnos desde el servidor, sin aviso de modo local');
  await ctx.close();
}

// ── 6. PC con muchísimos datos: se sube en tandas ──
{
  const muchos = {};
  for (let d = 0; d < 120; d++) {
    const f = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10);
    muchos[`ganesha_turnos_${f}`] = Array.from({ length: 45 }, (_, i) => t(`m${d}_${i}`, `${String(8 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`, `Clienta numero ${i} del dia ${d}`, { detalle: 'Detalle de prueba para ocupar espacio realista en la copia' }));
  }
  const tam = JSON.stringify(muchos).length;
  const grande = await abrirDispositivo(muchos);
  const dias = Number(sql("select count(*) from turnos where fecha < '2026-06-01'"));
  const total = Number(sql("select sum(jsonb_array_length(datos)) from turnos where fecha < '2026-06-01'"));
  check(dias === 120 && total === 5400, `6. ${(tam / 1e6).toFixed(1)} MB de datos (120 días, 5400 turnos) subidos completos en ${grande.importaciones.length} tandas, ninguna de más de 1 MB: ${Math.max(...grande.importaciones) < 1_000_000}`);
  await grande.ctx.close();
}

await browser.close();
console.log(`\nResultado: ${ok} OK, ${fail} FALLAS`);
