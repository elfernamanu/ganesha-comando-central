'use client';

import { useState, useEffect, useMemo } from 'react';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface ClienteData {
  id: string;
  nombre: string;
  celular: string;
  notas: string;
}

interface ClienteStats {
  totalTurnos: number;
  presentes: number;
  ausentes: number;
  tratamientoFrecuente: string;
}

type ClienteRow = ClienteData & ClienteStats;

// ── Calcula stats leyendo todos los turnos del localStorage ────────────────
function calcularStatsLS(): Map<string, ClienteStats> {
  const acum = new Map<string, {
    total: number; pres: number; aus: number;
    trats: Map<string, number>;
  }>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('ganesha_turnos_')) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const turnos = JSON.parse(raw) as Array<{
        clienteNombre?: string;
        asistencia?: string;
        tratamiento?: string;
      }>;
      for (const t of turnos) {
        const nombre = t.clienteNombre?.trim();
        if (!nombre) continue;
        if (!acum.has(nombre)) {
          acum.set(nombre, { total: 0, pres: 0, aus: 0, trats: new Map() });
        }
        const s = acum.get(nombre)!;
        s.total++;
        if (t.asistencia === 'presente') s.pres++;
        if (t.asistencia === 'no_vino')  s.aus++;
        if (t.tratamiento && t.tratamiento !== 'Otro') {
          s.trats.set(t.tratamiento, (s.trats.get(t.tratamiento) ?? 0) + 1);
        }
      }
    } catch { /* skip */ }
  }

  const resultado = new Map<string, ClienteStats>();
  for (const [nombre, s] of acum) {
    let trat = '';
    let max = 0;
    for (const [t, c] of s.trats) { if (c > max) { max = c; trat = t; } }
    resultado.set(nombre, {
      totalTurnos: s.total,
      presentes:   s.pres,
      ausentes:    s.aus,
      tratamientoFrecuente: trat,
    });
  }
  return resultado;
}

// ── Componente principal ───────────────────────────────────────────────────
export default function ContactosPage() {
  const [serverClientes, setServerClientes] = useState<ClienteData[]>([]);
  const [statsMap, setStatsMap] = useState<Map<string, ClienteStats>>(new Map());
  const [busqueda, setBusqueda]   = useState('');
  const [guardando, setGuardando] = useState(false);
  const [estado, setEstado]       = useState<'ok' | 'error' | ''>('');

  // Estado de edición inline
  const [editId, setEditId]         = useState<string | null>(null);
  const [editCelular, setEditCelular] = useState('');
  const [editNotas, setEditNotas]     = useState('');

  // 1. Calcular stats desde localStorage (una vez al montar)
  useEffect(() => {
    setStatsMap(calcularStatsLS());
  }, []);

  // 2. Cargar clientes del servidor
  useEffect(() => {
    fetch('/api/clientes')
      .then(r => r.json())
      .then((d: { ok: boolean; datos?: ClienteData[] }) => {
        if (d.ok && Array.isArray(d.datos) && d.datos.length > 0) {
          setServerClientes(d.datos);
        }
      })
      .catch(() => {});
  }, []);

  // 3. Mezclar: server + nuevos de localStorage que no están en server
  const rows = useMemo((): ClienteRow[] => {
    const byNombreLow = new Map(serverClientes.map(c => [c.nombre.toLowerCase(), c]));

    // Clientes solo en localStorage
    const extra: ClienteData[] = [];
    for (const [nombre] of statsMap) {
      if (!byNombreLow.has(nombre.toLowerCase())) {
        extra.push({ id: `ls_${nombre}`, nombre, celular: '', notas: '' });
      }
    }

    return [...serverClientes, ...extra]
      .map(c => ({
        ...c,
        ...(statsMap.get(c.nombre) ??
            // buscar con distinto case
            [...statsMap.entries()].find(([k]) => k.toLowerCase() === c.nombre.toLowerCase())?.[1] ??
            { totalTurnos: 0, presentes: 0, ausentes: 0, tratamientoFrecuente: '' }),
      }))
      .filter(c => c.totalTurnos > 0 || c.celular)
      .sort((a, b) => b.totalTurnos - a.totalTurnos);
  }, [serverClientes, statsMap]);

  const filtrados = useMemo(() => {
    if (!busqueda) return rows;
    const q = busqueda.toLowerCase();
    return rows.filter(c =>
      c.nombre.toLowerCase().includes(q) || c.celular.includes(q)
    );
  }, [rows, busqueda]);

  // Guardar lista actualizada al servidor
  const persistir = async (lista: ClienteData[]) => {
    setGuardando(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: lista }),
      });
      const d = await res.json() as { ok: boolean };
      setEstado(d.ok ? 'ok' : 'error');
    } catch {
      setEstado('error');
    } finally {
      setGuardando(false);
      setTimeout(() => setEstado(''), 2500);
    }
  };

  const abrirEdit = (c: ClienteRow) => {
    setEditId(c.id);
    setEditCelular(c.celular);
    setEditNotas(c.notas);
  };

  const guardarEdit = async (c: ClienteRow) => {
    const actualizado: ClienteData = {
      id: c.id.startsWith('ls_') ? crypto.randomUUID() : c.id,
      nombre:  c.nombre,
      celular: editCelular.trim(),
      notas:   editNotas.trim(),
    };
    const sinEste = serverClientes.filter(x => x.nombre.toLowerCase() !== c.nombre.toLowerCase());
    const nueva = [...sinEste, actualizado];
    setServerClientes(nueva);
    setEditId(null);
    await persistir(nueva);
  };

  const eliminarCliente = async (c: ClienteRow) => {
    const nueva = serverClientes.filter(x => x.nombre.toLowerCase() !== c.nombre.toLowerCase());
    setServerClientes(nueva);
    await persistir(nueva);
  };

  // Agregar cliente manual vacío
  const agregarManual = () => {
    const nuevo: ClienteData = { id: crypto.randomUUID(), nombre: '—', celular: '', notas: '' };
    setServerClientes(prev => [nuevo, ...prev]);
    setEditId(nuevo.id);
    setEditCelular('');
    setEditNotas('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3">

      {/* Encabezado */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">👥 Clientes</h2>
          <p className="text-[11px] text-slate-400">
            {rows.length} contacto{rows.length !== 1 ? 's' : ''}
            {' · '}
            {rows.filter(c => c.ausentes > 0).length} con ausencias
          </p>
        </div>
        <div className="flex items-center gap-2">
          {estado === 'ok'    && <span className="text-[11px] text-emerald-600 dark:text-emerald-400">✓ guardado</span>}
          {estado === 'error' && <span className="text-[11px] text-red-500">✗ error</span>}
          {guardando          && <span className="text-[11px] text-slate-400">guardando…</span>}
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 w-28"
          />
          <button
            onClick={agregarManual}
            className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium"
          >
            + Nuevo
          </button>
        </div>
      </div>

      {/* Encabezado columnas */}
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        <span>Nombre · tratamiento</span>
        <span className="w-28 text-right">Celular</span>
        <span className="w-20 text-right">Turnos</span>
        <span className="w-5" />
      </div>

      {/* Lista */}
      <div className="space-y-px">
        {filtrados.map(c => (
          editId === c.id ? (
            /* ── Modo edición ── */
            <div key={c.id} className="px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 space-y-1.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{c.nombre}</p>
              <div className="flex gap-2">
                <input
                  value={editCelular}
                  onChange={e => setEditCelular(e.target.value)}
                  placeholder="📱 Celular (ej: 11-1234-5678)"
                  className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
                <input
                  value={editNotas}
                  onChange={e => setEditNotas(e.target.value)}
                  placeholder="Notas (ej: cobrar seña si falta)"
                  className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditId(null)} className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200">
                  Cancelar
                </button>
                <button onClick={() => guardarEdit(c)} className="px-3 py-0.5 text-xs rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            /* ── Modo vista ── */
            <div key={c.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
              {/* Nombre + tratamiento + notas */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                  {c.nombre}
                </p>
                {c.tratamientoFrecuente && (
                  <p className="text-[10px] text-slate-400 truncate leading-tight">{c.tratamientoFrecuente}</p>
                )}
                {c.notas && (
                  <p className="text-[10px] text-amber-500 dark:text-amber-400 truncate leading-tight">⚠️ {c.notas}</p>
                )}
              </div>

              {/* Celular */}
              <span className="w-28 text-right text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
                {c.celular || <span className="text-slate-300 dark:text-slate-600">—</span>}
              </span>

              {/* Stats */}
              <div className="w-20 flex items-center justify-end gap-1 shrink-0">
                <span className="text-[11px] font-mono text-slate-500">{c.totalTurnos}</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">✓{c.presentes}</span>
                {c.ausentes > 0 && (
                  <span className="text-[11px] font-bold text-red-500 dark:text-red-400">✗{c.ausentes}</span>
                )}
              </div>

              {/* Acciones */}
              <div className="w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => abrirEdit(c)}
                  title="Editar"
                  className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  ✏️
                </button>
              </div>
            </div>
          )
        ))}
      </div>

      {filtrados.length === 0 && (
        <p className="text-center py-10 text-sm text-slate-400">
          {busqueda
            ? 'Sin resultados para esa búsqueda'
            : 'Los clientes aparecen automáticamente desde los turnos cargados'}
        </p>
      )}

      {/* Pie — info */}
      <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 pt-1">
        Stats calculados desde turnos locales · celular y notas se guardan en servidor
      </p>
    </div>
  );
}
