import type { TurnoSecretaria, TotalesCaja } from '../hooks/useCajaDiaria';
import type { Gasto } from '../types/index';
import type { GastoFijo } from '../hooks/useGastosFijos';
import { formatearFecha } from './formatters';

const SEP  = '═'.repeat(52);
const sep  = '─'.repeat(52);

function m(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });
}

function linea(label: string, valor: string, ancho = 52): string {
  const espacios = ancho - label.length - valor.length;
  return label + ' '.repeat(Math.max(1, espacios)) + valor;
}

export function generarReporteTxt(
  fecha: string,
  turnos: TurnoSecretaria[],
  gastos: Gasto[],
  totales: TotalesCaja,
  gastosEmpresa: GastoFijo[] = [],
  gastosPersonal: GastoFijo[] = [],
): string {
  const fechaLabel = formatearFecha(new Date(fecha + 'T12:00:00'))
    .replace(/^\w/, c => c.toUpperCase());

  // ── Asistencia ────────────────────────────────────────────────────────────
  const presentes = turnos.filter(t => t.asistencia === 'presente').length;
  const ausentes  = turnos.filter(t => t.asistencia === 'no_vino').length;

  // ── Fijos ─────────────────────────────────────────────────────────────────
  const gEmp = gastosEmpresa.filter(g => g.activo);
  const gPer = gastosPersonal.filter(g => g.activo);
  const saldo = (g: GastoFijo) => Math.max(0, g.montoTotal - (g.montoAcumulado ?? 0));

  const empPag = gEmp.filter(g => g.pagado ?? false);
  const perPag = gPer.filter(g => g.pagado ?? false);
  const empPen = gEmp.filter(g => !(g.pagado ?? false));
  const perPen = gPer.filter(g => !(g.pagado ?? false));

  const totalPagados   = [...empPag, ...perPag].reduce((s, g) => s + (g.montoAcumulado ?? 0), 0);
  const totalPendiente = [...empPen, ...perPen].reduce((s, g) => s + saldo(g), 0);

  // ── Ganancia del día ──────────────────────────────────────────────────────
  const gananciaDia = totales.ingresos_totales - totales.gastos_totales;

  // ── Armar TXT ─────────────────────────────────────────────────────────────
  const L: string[] = [];
  const add = (...lineas: string[]) => lineas.forEach(l => L.push(l));

  add(
    SEP,
    `  GANESHA ESTHETIC — CIERRE DE CAJA`,
    `  ${fechaLabel}`,
    SEP,
    '',
  );

  // Ingresos
  add(
    linea('  INGRESOS DEL DÍA', m(totales.ingresos_totales)),
    `  ${presentes} presentes · ${ausentes} no vinieron · ${turnos.length} turnos en total`,
  );
  if (totales.efectivo > 0 || totales.transferencia > 0) {
    const partes = [];
    if (totales.efectivo      > 0) partes.push(`Efectivo ${m(totales.efectivo)}`);
    if (totales.transferencia > 0) partes.push(`Transferencia ${m(totales.transferencia)}`);
    if (totales.otro          > 0) partes.push(`Otro ${m(totales.otro)}`);
    add(`  ${partes.join('  ·  ')}`);
  }
  add('');

  // Gastos del día
  if (gastos.length > 0) {
    add(`  GASTOS DEL DÍA`);
    gastos.forEach(g => {
      const lbl = `    · ${g.concepto}`;
      add(linea(lbl, m(g.monto)));
    });
    add(linea('  Total gastos del día', `−${m(totales.gastos_totales)}`), '');
  }

  // Ganancia del día
  add(
    sep,
    linea(`  ${gananciaDia >= 0 ? '✓' : '!'} GANANCIA DEL DÍA`, m(gananciaDia)),
    `  (ingresos del día menos gastos de hoy)`,
    sep,
    '',
  );

  // A pagar este mes
  if (totalPendiente > 0) {
    add(
      linea('  ⚠ A PAGAR ESTE MES', m(totalPendiente)),
      sep,
    );
    if (empPen.length > 0) {
      add('  [Empresa]');
      empPen.forEach(g => {
        const s = saldo(g);
        const detalle = g.montoAcumulado ? ` (pagó ${m(g.montoAcumulado ?? 0)} de ${m(g.montoTotal)})` : '';
        add(linea(`    ${g.nombre}${detalle}`, s > 0 ? m(s) : '—'));
      });
    }
    if (perPen.length > 0) {
      add('  [Personal — Mirian G. Francolino]');
      perPen.forEach(g => {
        const s = saldo(g);
        const detalle = g.montoAcumulado ? ` (pagó ${m(g.montoAcumulado ?? 0)} de ${m(g.montoTotal)})` : '';
        add(linea(`    ${g.nombre}${detalle}`, s > 0 ? m(s) : '—'));
      });
    }
    add('');
  }

  // Fijos ya pagados
  if (totalPagados > 0) {
    add(linea('  ✓ Fijos del mes ya pagados', m(totalPagados)));
    [...empPag, ...perPag].forEach(g =>
      add(linea(`    ✓ ${g.nombre}`, m(g.montoAcumulado ?? 0)))
    );
    add('');
  }

  add(
    sep,
    `  Responsable: Mirian G. Francolino`,
    `  Generado:    ${fecha}`,
    SEP,
  );

  return L.join('\n');
}

export function descargarReporte(contenido: string, fecha: string): void {
  try {
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `GANESHA_CIERRE_${fecha}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Error al descargar reporte:', err);
    alert('Error al descargar el reporte. Intenta de nuevo.');
  }
}
