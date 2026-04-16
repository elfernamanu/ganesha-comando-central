'use client';

import { useState, useEffect, useMemo } from 'react';

interface ClienteData {
  id: string; nombre: string; celular: string; notas: string;
}
interface ClienteStats {
  totalTurnos: number; presentes: number; ausentes: number; tratamientoFrecuente: string;
}
type ClienteRow = ClienteData & ClienteStats;

function esHombre(trat: string): boolean {
  const t = trat.toLowerCase();
  return t.includes('hombre') || trat.includes('💪');
}

function calcularStatsLS(): Map<string, ClienteStats> {
  const acum = new Map<string, { total: number; pres: number; aus: number; trats: Map<string, number> }>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('ganesha_turnos_')) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const turnos = JSON.parse(raw) as Array<{ clienteNombre?: string; asistencia?: string; tratamiento?: string }>;
      for (const t of turnos) {
        const nombre = t.clienteNombre?.trim();
        if (!nombre) continue;
        if (!acum.has(nombre)) acum.set(nombre, { total: 0, pres: 0, aus: 0, trats: new Map() });
        const s = acum.get(nombre)!;
        s.total++;
        if (t.asistencia === 'presente') s.pres++;
        if (t.asistencia === 'no_vino')  s.aus++;
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

// ── Fila compacta ──────────────────────────────────────────────────────────
function FilaCliente({ c, onEdit, onDelete }: {
  c: ClienteRow;
  onEdit:   (c: ClienteRow) => void;
  onDelete: (c: ClienteRow) => void;
}) {
  const falta = c.ausentes > 0;
  return (
    <div className={`group px-2 py-1 flex items-start gap-1 border-b border-slate-100 dark:border-slate-700/50 last:border-0
      ${falta ? 'bg-red-50/70 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100 leading-tight">
            {c.nombre}
          </span>
          {c.celular
            ? <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{c.celular}</span>
            : <span className="text-[10px] text-slate-300 dark:text-slate-600">sin tel.</span>
          }
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {c.tratamientoFrecuente && (
            <span className="text-[9px] text-slate-400 truncate max-w-[110px]">{c.tratamientoFrecuente}</span>
          )}
          {/* Stats */}
          <span className="text-[10px] font-mono text-slate-400">{c.totalTurnos}t</span>
          {c.presentes > 0 && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓{c.presentes}</span>}
          {falta         && <span className="text-[10px] font-bold text-red-500">✗{c.ausentes} ⚠️cobrar seña</span>}
          {c.notas && !falta && <span className="text-[10px] text-amber-500 truncate">⚠️{c.notas}</span>}
        </div>
      </div>

      {/* Acciones hover */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
        <button onClick={() => onEdit(c)}   className="text-[10px] text-slate-400 hover:text-blue-500 px-0.5">✏️</button>
        <button onClick={() => onDelete(c)} className="text-[10px] text-slate-400 hover:text-red-500 px-0.5">🗑️</button>
      </div>
    </div>
  );
}

// ── Columna (Mujeres o Hombres) ────────────────────────────────────────────
function Columna({ titulo, icono, color, items, onEdit, onDelete }: {
  titulo:   string;
  icono:    string;
  color:    string;
  items:    ClienteRow[];
  onEdit:   (c: ClienteRow) => void;
  onDelete: (c: ClienteRow) => void;
}) {
  const [filtro, setFiltro] = useState('');
  const filtrados = useMemo(() => {
    if (!filtro) return items;
    const q = filtro.toLowerCase();
    return items.filter(c => c.nombre.toLowerCase().includes(q) || c.celular.includes(q));
  }, [items, filtro]);

  const ausentes = items.filter(c => c.ausentes > 0).length;

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden min-h-0">

      {/* Header */}
      <div className={`px-3 py-2 border-b border-slate-200 dark:border-slate-700 ${color}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            {icono} {titulo}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="font-semibold">{items.length}</span>
            {ausentes > 0 && (
              <span className="text-red-500 font-bold">⚠️{ausentes}</span>
            )}
          </div>
        </div>
        <input
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          placeholder={`Buscar ${titulo.toLowerCase()}...`}
          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      </div>

      {/* Lista scrollable */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: '65vh' }}>
        {filtrados.length === 0
          ? <p className="text-center py-6 text-[11px] text-slate-400">
              {filtro ? 'Sin resultados' : 'Sin registros'}
            </p>
          : filtrados.map(c => (
              <FilaCliente key={c.id} c={c} onEdit={onEdit} onDelete={onDelete} />
            ))
        }
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────
export default function ContactosPage() {
  const [serverClientes, setServerClientes] = useState<ClienteData[]>([]);
  const [statsMap, setStatsMap]             = useState<Map<string, ClienteStats>>(new Map());
  const [guardando, setGuardando]           = useState(false);
  const [estado, setEstado]                 = useState<'ok' | 'error' | ''>('');
  const [editId, setEditId]                 = useState<string | null>(null);
  const [editNombre, setEditNombre]         = useState('');
  const [editCelular, setEditCelular]       = useState('');
  const [editNotas, setEditNotas]           = useState('');

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
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [serverClientes, statsMap]);

  const mujeres = rows.filter(c => !esHombre(c.tratamientoFrecuente));
  const hombres = rows.filter(c =>  esHombre(c.tratamientoFrecuente));

  const persistir = async (lista: ClienteData[]) => {
    setGuardando(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: lista }),
      });
      const d = await res.json() as { ok: boolean };
      setEstado(d.ok ? 'ok' : 'error');
    } catch { setEstado('error'); }
    finally { setGuardando(false); setTimeout(() => setEstado(''), 2500); }
  };

  const abrirEdit = (c: ClienteRow) => {
    setEditId(c.id); setEditNombre(c.nombre);
    setEditCelular(c.celular); setEditNotas(c.notas);
  };

  const guardarEdit = async () => {
    const c = rows.find(r => r.id === editId);
    if (!c) return;
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
    setEditId(nuevo.id); setEditNombre(''); setEditCelular(''); setEditNotas('');
  };

  return (
    <div className="space-y-3">

      {/* Encabezado global */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">👥 Clientes</h2>
          <p className="text-[11px] text-slate-400">
            {rows.length} total · {mujeres.length} mujeres · {hombres.length} hombres
            {rows.filter(c => c.ausentes > 0).length > 0 && (
              <> · <span className="text-red-500 font-semibold">⚠️ {rows.filter(c => c.ausentes > 0).length} con ausencias</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {estado === 'ok'    && <span className="text-[11px] text-emerald-600 dark:text-emerald-400">✓ guardado</span>}
          {estado === 'error' && <span className="text-[11px] text-red-500">✗ error</span>}
          {guardando          && <span className="text-[11px] text-slate-400">guardando…</span>}
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
            <input value={editNombre}  onChange={e => setEditNombre(e.target.value)}
              placeholder="Nombre completo"
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
            <input value={editCelular} onChange={e => setEditCelular(e.target.value)}
              placeholder="📱 Celular" inputMode="tel"
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono" />
            <input value={editNotas}   onChange={e => setEditNotas(e.target.value)}
              placeholder="Notas (ej: cobrar seña)"
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditId(null)}
              className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200">Cancelar</button>
            <button onClick={guardarEdit}
              className="px-3 py-0.5 text-xs rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">Guardar</button>
          </div>
        </div>
      )}

      {/* ── DOS COLUMNAS ── */}
      <div className="grid grid-cols-2 gap-3">
        <Columna
          titulo="Mujeres" icono="👩" color="bg-pink-50/50 dark:bg-pink-900/10"
          items={mujeres} onEdit={abrirEdit} onDelete={eliminar}
        />
        <Columna
          titulo="Hombres" icono="👨" color="bg-blue-50/50 dark:bg-blue-900/10"
          items={hombres} onEdit={abrirEdit} onDelete={eliminar}
        />
      </div>

    </div>
  );
}
