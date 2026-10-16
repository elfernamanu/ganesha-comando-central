// La PC de la dueña es la única copia: peores casos de orden y de borrado.
import { createRequire } from 'module';
import { execSync, spawn } from 'child_process';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const APP = '/home/user/ganesha-comando-central';
const PORT = 3207, BASE = `http://localhost:${PORT}`;
const DB_URL = 'postgresql://app_clave:[Ab#12@xy/9?z:%Q]@localhost:5433/ganesha5';
const sql = q => execSync(`psql -h /tmp -p 5433 -U pgtest -d ganesha5 -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
let ok = 0, fail = 0;
const check = (c, m) => { console.log(`${c ? 'OK  ' : 'FALLA'} ${m}`); c ? ok++ : fail++; };
const espera = ms => new Promise(r => setTimeout(r, ms));

let srv = null;
async function arrancar(conBase) {
  const env = { ...process.env }; delete env.DATABASE_URL; delete env.POSTGRES_URL;
  if (conBase) env.DATABASE_URL = DB_URL;
  srv = spawn('npx', ['next', 'start', '-p', String(PORT)], { cwd: APP, env, detached: true, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { await fetch(BASE + '/api/health'); return; } catch { await espera(500); } }
  throw new Error('el servidor no arrancó');
}
async function parar() { if (srv) { try { process.kill(-srv.pid, 'SIGTERM'); } catch {} srv = null; await espera(1500); } }

const A = '2026-10-20', C = '2026-10-27';
const t = (id, h, n, extra = {}) => ({ id, horario: h, clienteNombre: n, tratamiento: '', detalle: '', asistencia: '', monto_total: 24000, extra: 0, seña_pagada: 0, estado_pago: 'sin_pago', metodo_pago: 'efectivo', ...extra });
const personalReal = [{ id: 'p1', nombre: 'Cuota del auto de la dueña', monto: 123456, categoria: 'personal' }];
const pc = {
  [`ganesha_turnos_${A}`]: [t('a1', '10:00', 'Ana Gomez', { asistencia: 'presente', seña_pagada: 24000, estado_pago: 'completo' }), t('a2', '10:30', 'Bea Diaz'), t('a3', '11:00', 'Caro Ruiz')],
  ganesha_gastos_fijos_personal_v2: personalReal,
  ganesha_gastos_fijos_empresa_v2: [{ id: 'g1', nombre: 'Alquiler del local', monto: 300000 }],
  ganesha_clientes_backup: [{ id: 'c1', nombre: 'Ana Gomez', celular: '1155550001', notas: '', genero: 'f' }],
};
const leer = (page, k) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), k);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

try {
  // ── 1. La dueña abre la Caja con las tablas recién creadas y vacías, y su copia tarda en llegar ──
  await arrancar(true);
  await fetch(BASE + '/api/admin/instalar', { method: 'POST' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.route('**/api/admin/importar', async r => { await espera(8000); await r.continue(); });
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(d => { for (const [k, v] of Object.entries(d)) localStorage.setItem(k, JSON.stringify(v)); }, pc);
  await page.goto(`${BASE}/admin/panel-control/caja?fecha=${A}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!localStorage.getItem('ganesha_copia_auto_v1'), null, { timeout: 40000 });
  await espera(2000);

  check((await leer(page, `ganesha_turnos_${A}`))?.length === 3, '1a. La copia de la PC NO se borró aunque Caja consultó el servidor vacío antes de que llegaran los datos');
  const perLS = await leer(page, 'ganesha_gastos_fijos_personal_v2');
  check(perLS?.some(g => g.nombre === 'Cuota del auto de la dueña'), '1b. Los gastos personales de la PC NO se reemplazaron por los de fábrica');
  check(sql(`select jsonb_array_length(datos) from turnos where fecha='${A}'`) === '3', '1c. En el servidor: los 3 turnos de la PC');
  check(sql("select datos::text from config_servicios where id=-2").includes('Cuota del auto de la dueña'), '1d. En el servidor: los gastos personales reales, no los de fábrica');
  check(sql("select datos::text from config_servicios where id=-1").includes('Alquiler del local'), '1e. En el servidor: los gastos de la empresa');
  const foto = await page.evaluate(() => new Promise(ok => {
    const r = indexedDB.open('ganesha_respaldo', 1);
    r.onsuccess = () => { const g = r.result.transaction('copias').objectStore('copias').get('inicial'); g.onsuccess = () => ok(g.result ?? null); g.onerror = () => ok(null); };
    r.onerror = () => ok(null);
  }));
  check(foto?.claves?.[`ganesha_turnos_${A}`]?.length === 3, '1f. Se guardó el respaldo interno con los datos de la PC');
  await ctx.close();
  await parar();

  // ── 2. Se borra un día de la memoria del navegador: se recupera del respaldo interno ──
  await arrancar(false); // todavía sin base: se toma el respaldo pero no se sube nada
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p2.evaluate(([k, v]) => localStorage.setItem(k, v), [`ganesha_turnos_${C}`, JSON.stringify([t('c1', '15:00', 'Dora Luz'), t('c2', '15:30', 'Elsa Mar')])]);
  await p2.reload({ waitUntil: 'domcontentloaded' });
  await espera(3000);
  await p2.evaluate(k => localStorage.setItem(k, '[]'), `ganesha_turnos_${C}`);   // algo vació ese día
  check((await leer(p2, `ganesha_turnos_${C}`))?.length === 0, '2a. (Simulación) el día quedó vacío en la memoria del navegador');
  await parar();
  await arrancar(true);  // vuelve el servidor
  await p2.reload({ waitUntil: 'domcontentloaded' });
  await p2.waitForFunction(() => !!localStorage.getItem('ganesha_copia_auto_v1'), null, { timeout: 40000 });
  check(sql(`select coalesce(jsonb_array_length(datos),0) from turnos where fecha='${C}'`) === '2', '2b. Los 2 turnos del día borrado llegaron igual al servidor, desde el respaldo interno');
  await p2.goto(BASE + '/admin/panel-control/copia', { waitUntil: 'domcontentloaded' });
  await p2.getByText('Respaldo interno protegido', { exact: false }).last().waitFor({ timeout: 15000 });
  check(true, '2c. La pantalla de copia muestra que el respaldo interno está protegido');
  await ctx2.close();
} finally {
  await parar();
  await browser.close();
}
console.log(`\nResultado: ${ok} OK, ${fail} FALLAS`);
