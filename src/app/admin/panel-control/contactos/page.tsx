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
  presentes:   number;
  ausentes:    number;
  tratamientoFrecuente: string;
}

type ClienteRow = ClienteData & ClienteStats;

// ── Detectar género por tratamiento ───────────────────────────────────────
function esHombre(trat: string): boolean {
  const t = trat.toLowerCase();
  return t.includes('hombre') || trat.includes('💪');
}

// ── Calcular stats desde localStorage ─────────────────────────────────────
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
        if (!acum.has(nombre)) acum.set(nombre, { total: 0, pres: 0, aus: 0, trats: new Map() });
        const s = acum.get(nombre)!;
        s.total++;
        if (t.asistencia === 'presente')  s.pres++;
        if (t.asistencia === 'no_vino')   s.aus++;
        if (t.tratamiento && t.tratamiento !== 'Otro')
          s.trats.set(t.tratamiento, (s.trats.get(t.tratamiento) ?? 0) + 1);
      }
    } catch { /* skip */ }
  }

  const out = new Map<string, ClienteStats>();
  for (const [nombre, s] of acum) {
    let trat = ''; let max = 0;
    for (const [t, c] of s.trats) { if (c > max) { max = c; trat = t; } }
    out.set(nombre, { totalTurnos: s.total, presentes: s.pres, ausentes: s.aus, tratamientoFrecuente: trat });
  }
  return out;
}

// ── Componente Stats inline ────────────────────────────────────────────────
function Stats({ c }: { c: ClienteRow }) {
  return (
    <span className="flex items-center gap-1 font-mono text-[11px]">
      <span className="text-slate-400">{c.totalTurnos}</span>
      {c.presentes > 0 && (
        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓{c.presentes}</span>
      )}
      {c.ausentes > 0 && (
        <span className="text-red-500 font-bold">✗{c.ausentes}</span>
      )}
    </span>
  );
}

// ── Fila individual ────────────────────────────────────────────────────────
interface FilaProps {
  c: ClienteRow;
  onEdit:   (c: ClienteRow) => void;
  onDelete: (c: ClienteRow) => void;
}
function Fila({ c, onEdit, onDelete }: FilaProps) {
  const falta = c.ausentes > 0;
  return (
    <div className={`grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 items-center px-3 py-1 group rounded-lg
      ${falta ? 'bg-red-50/60 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>

      {/* Nombre */}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
          {c.nombre}
        </p>
        {falta && (
          <p className="text-[10px] font-semibold text-red-500 leading-tight">⚠️ cobrar seña</p>
        )}
        {c.notas && !falta && (
          <p className="text-[10px] text-amber-500 leading-tight truncate">⚠️ {c.notas}</p>
        )}
      </div>

      {/* Celular */}
      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 w-28 text-right shrink-0">
        {c.celular || <span className="text-slate-300 dark:text-slate-600">—</span>}
      </span>

      {/* Tratamiento */}
      <span className="text-[10px] text-slate-400 w-32 text-right truncate shrink-0 hidden sm:block">
        {c.tratamientoFrecuente || '—'}
      </span>

      {/* Stats */}
      <div className="w-16 flex justify-end shrink-0">
        <Stats c={c} />
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(c)}
          className="p-0.5 text-[10px] text-slate-400 hover:text-blue-500 rounded">✏️</button>
        <button onClick={() => onDelete(c)}
          className="p-0.5 text-[10px] text-slate-400 hover:text-red-500 rounded">🗑️</button>
      </div>
    </div>
  );
}

// ── Sección (Mujeres / Hombres) ────────────────────────────────────────────
interface SeccionProps {
  titulo: string;
  icono:  string;
  items:  ClienteRow[];
  onEdit:   (c: ClienteRow) => void;
  onDelete: (c: ClienteRow) => void;
}
function Seccion({ titulo, icono, items, onEdit, onDelete }: SeccionProps) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      {/* Header sección */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-700">
        <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
          {icono} {titulo}
        </p>
        <span className="text-[11px] text-slate-400">{items.length}</span>
      </div>

      {/* Encabezado columnas */}
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-2 px-3 py-0.5 border-b border-slate-100 dark:border-slate-700/50">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Nombre</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide w-28 text-right">Celular</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide w-32 text-right hidden sm:block">Tratamiento</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide w-16 text-right">Turnos</span>
        <span className="w-10" />
      </div>

      {/* Filas */}
      <div className="divide-y divide-slate-100/60 dark:divide-slate-700/30">
        {items.map(c => (
          <Fila key={c.id} c={c} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function ContactosPage() {
  const [serverClientes, setServerClientes] = useState<ClienteData[]>([]);
  const [statsMap, setStatsMap]             = useState<Map<string, ClienteStats>>(new Map());
  const [busqueda, setBusqueda]             = useState('');
  const [guardando, setGuardando]           = useState(false);
  const [estado, setEstado]                 = useState<'ok' | 'error' | ''>('');

  // Edición inline
  const [editId, setEditId]               = useState<string | null>(null);
  const [editCelular, setEditCelular]     = useState('');
  const [editNotas, setEditNotas]         = useState('');
  const [editNombre, setEditNombre]       = useState('');

  useEffect(() => { setStatsMap(calcularStatsLS()); }, []);

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => r.json())
      .then((d: { ok: boolean; datos?: ClienteData[] }) => {
        if (d.ok && Array.isArray(d.datos) && d.datos.length > 0)
          setServerClientes(d.datos);
      })
      .catch(() => {});
  }, []);

  // Mezclar: server + nuevos de localStorage
  const rows = useMemo((): ClienteRow[] => {
    const byLow = new Map(serverClientes.map(c => [c.nombre.toLowerCase(), c]));
    const extra: ClienteData[] = [];
    for (const [nombre] of statsMap) {
      if (!byLow.has(nombre.toLowerCase()))
        extra.push({ id: `ls_${nombre}`, nombre, celular: '', notas: '' });
    }
    return [...serverClientes, ...extra]
      .map(c => {
        const stats =
          statsMap.get(c.nombre) ??
          [...statsMap.entries()].find(([k]) => k.toLowerCase() === c.nombre.toLowerCase())?.[1] ??
          { totalTurnos: 0, presentes: 0, ausentes: 0, tratamientoFrecuente: '' };
        return { ...c, ...stats };
      })
      .filter(c => c.totalTurnos > 0 || c.celular)
      .sort((a, b) => b.totalTurnos - a.totalTurnos);
  }, [serverClientes, statsMap]);

  const filtrados = useMemo(() => {
    if (!busqueda) return rows;
    const q = busqueda.toLowerCase();
    return rows.filter(c => c.nombre.toLowerCase().includes(q) || c.celular.includes(q));
  }, [rows, busqueda]);

  const mujeres = filtrados.filter(c => !esHombre(c.tratamientoFrecuente));
  const hombres = filtrados.filter(c =>  esHombre(c.tratamientoFrecuente));

  // Persistir lista en servidor
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
    } catch { setEstado('error'); }
    finally {
      setGuardando(false);
      setTimeout(() => setEstado(''), 2500);
    }
  };

  const abrirEdit = (c: ClienteRow) => {
    setEditId(c.id);
    setEditCelular(c.celular);
    setEditNotas(c.notas);
    setEditNombre(c.nombre);
  };

  const guardarEdit = async (c: ClienteRow) => {
    const updated: ClienteData = {
      id:      c.id.startsWith('ls_') ? crypto.randomUUID() : c.id,
      nombre:  editNombre.trim() || c.nombre,
      celular: editCelular.trim(),
      notas:   editNotas.trim(),
    };
    const sin = serverClientes.filter(x => x.nombre.toLowerCase() !== c.nombre.toLowerCase());
    const nueva = [...sin, updated];
    setServerClientes(nueva);
    setEditId(null);
    await persistir(nueva);
  };

  const eliminar = async (c: ClienteRow) => {
    const nueva = serverClientes.filter(x => x.nombre.toLowerCase() !== c.nombre.toLowerCase());
    setServerClientes(nueva);
    await persistir(nueva);
  };

  const agregarManual = () => {
    const nuevo: ClienteData = { id: crypto.randomUUID(), nombre: '', celular: '', notas: '' };
    setServerClientes(prev => [nuevo, ...prev]);
    setEditId(nuevo.id);
    setEditCelular(''); setEditNotas(''); setEditNombre('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-3">

      {/* Encabezado */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">👥 Clientes</h2>
          <p className="text-[11px] text-slate-400">
            {rows.length} contacto{rows.length !== 1 ? 's' : ''}
            {' · '}
            {rows.filter(c => c.ausentes > 0).length > 0 && (
              <span className="text-red-500 font-semibold">
                ⚠️ {rows.filter(c => c.ausentes > 0).length} con ausencias
              </span>
            )}
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
          <button onClick={agregarManual}
            className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium">
            + Nuevo
          </button>
        </div>
      </div>

      {/* Modal edición */}
      {editId && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 space-y-2">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Editar contacto</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input value={editNombre}   onChange={e => setEditNombre(e.target.value)}
              placeholder="Nombre"
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
            <input value={editCelular}  onChange={e => setEditCelular(e.target.value)}
              placeholder="📱 Celular" inputMode="tel"
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono" />
            <input value={editNotas}    onChange={e => setEditNotas(e.target.value)}
              placeholder="Notas"
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditId(null)}
              className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200">
              Cancelar
            </button>
            <button
              onClick={() => {
                const c = rows.find(r => r.id === editId);
                if (c) guardarEdit(c);
              }}
              className="px-3 py-0.5 text-xs rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">
              Guardar
            </button>
          </div>
        </div>
      )}

      {/* Secciones por género */}
      <Seccion titulo="Mujeres" icono="👩" items={mujeres} onEdit={abrirEdit} onDelete={eliminar} />
      <Seccion titulo="Hombres" icono="👨" items={hombres} onEdit={abrirEdit} onDelete={eliminar} />

      {filtrados.length === 0 && (
        <p className="text-center py-10 text-sm text-slate-400">
          {busqueda ? 'Sin resultados' : 'Los clientes aparecen automáticamente desde los turnos cargados'}
        </p>
      )}

      <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 pt-1">
        Stats desde turnos locales · celular y notas en servidor
      </p>
    </div>
  );
}
