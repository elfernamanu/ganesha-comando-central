'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

// ── Tipos ──────────────────────────────────────────────────────────────────
interface ClienteData {
  id: string;
  nombre: string;
  originalNombre?: string; // nombre como figura en los turnos (para buscar stats)
  celular: string;
  notas: string;
  genero: 'm' | 'f';
}

interface ClienteStats {
  totalTurnos: number; presentes: number; ausentes: number;
  tratamientoFrecuente: string;
  generoDetectado: 'm' | 'f'; // detectado desde el tratamiento del turno
}

type ClienteRow = ClienteData & ClienteStats;

// ── Title case para nombres en mayúsculas ─────────────────────────────────
function titleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ── Descarga TXT clásico (bloc de notas) ──────────────────────────────────
function descargarContactosTxt(rows: ClienteRow[]) {
  const fecha = new Date().toLocaleDateString('es-AR');
  const sep   = '='.repeat(58);
  const lin   = '-'.repeat(58);
  const conTel = rows.filter(r => r.celular).length;

  // Formato simple: NOMBRE | CELULAR | NOTAS  (una línea por cliente)
  const lineas: string[] = [
    sep,
    'GANESHA ESTHETIC - AGENDA DE CONTACTOS',
    `Exportado: ${fecha}   Total: ${rows.length} contactos   Con numero: ${conTel}`,
    sep,
    '',
  ];

  const mujeres = rows.filter(r => r.genero === 'f');
  const hombres = rows.filter(r => r.genero === 'm');

  for (const [titulo, lista] of [['MUJERES', mujeres], ['HOMBRES', hombres]] as const) {
    if (lista.length === 0) continue;
    lineas.push(`${titulo} (${lista.length})`);
    lineas.push(lin);
    for (const c of lista) {
      // Nombre limpio sin padding especial (evita problemas con acentos en Windows)
      const nombre = titleCase(c.nombre);
      const tel    = c.celular ? c.celular : '(sin numero)';
      const notas  = c.notas  ? `  [${c.notas}]` : '';
      lineas.push(`${nombre} | ${tel}${notas}`);
    }
    lineas.push('');
  }

  lineas.push(sep);
  lineas.push(`Con numero: ${conTel} | Sin numero: ${rows.length - conTel}`);

  // BOM + contenido: el BOM (\uFEFF) hace que Windows Bloc de Notas muestre bien los acentos
  const bom      = '\uFEFF';
  const contenido = bom + lineas.join('\r\n');
  const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `GANESHA_CONTACTOS_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Descarga formato WhatsApp (para cargar en teléfono nuevo) ─────────────
function descargarContactosWhatsapp(rows: ClienteRow[]) {
  const fecha = new Date().toLocaleDateString('es-AR');
  const conTel  = rows.filter(r => r.celular);
  const sinTel  = rows.filter(r => !r.celular);
  const lineas = [
    `*GANESHA ESTHETIC — CONTACTOS*`,
    `_Exportado: ${fecha} · ${conTel.length} con número · ${sinTel.length} sin número_`,
    '',
  ];

  const mujeres = conTel.filter(r => r.genero === 'f');
  const hombres = conTel.filter(r => r.genero === 'm');

  if (mujeres.length > 0) {
    lineas.push('👩 *MUJERES*');
    for (const c of mujeres) {
      const notas = c.notas ? ` — _${c.notas}_` : '';
      lineas.push(`• ${titleCase(c.nombre)}: ${c.celular}${notas}`);
    }
    lineas.push('');
  }

  if (hombres.length > 0) {
    lineas.push('👨 *HOMBRES*');
    for (const c of hombres) {
      const notas = c.notas ? ` — _${c.notas}_` : '';
      lineas.push(`• ${titleCase(c.nombre)}: ${c.celular}${notas}`);
    }
    lineas.push('');
  }

  if (sinTel.length > 0) {
    lineas.push(`⚠️ *SIN NÚMERO REGISTRADO (${sinTel.length}):*`);
    for (const c of sinTel) {
      lineas.push(`• ${titleCase(c.nombre)}`);
    }
  }

  const blob = new Blob([lineas.join('\r\n')], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `GANESHA_CONTACTOS_WHATSAPP_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Stats + género desde localStorage ─────────────────────────────────────
function calcularStatsLS(): Map<string, ClienteStats> {
  const acum = new Map<string, {
    total: number; pres: number; aus: number;
    trats: Map<string, number>; esHombre: boolean;
  }>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('ganesha_turnos_')) continue;
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const turnos = JSON.parse(raw) as Array<{
        clienteNombre?: string; asistencia?: string; tratamiento?: string;
      }>;
      for (const t of turnos) {
        const nombre = t.clienteNombre?.trim();
        if (!nombre) continue;
        if (!acum.has(nombre)) acum.set(nombre, { total: 0, pres: 0, aus: 0, trats: new Map(), esHombre: false });
        const s = acum.get(nombre)!;
        s.total++;
        if (t.asistencia === 'presente') s.pres++;
        if (t.asistencia === 'no_vino')  s.aus++;
        if (t.tratamiento && t.tratamiento !== 'Otro') {
          s.trats.set(t.tratamiento, (s.trats.get(t.tratamiento) ?? 0) + 1);
          // Detectar hombre desde el tratamiento del turno
          const tl = t.tratamiento.toLowerCase();
          if (tl.includes('hombre') || t.tratamiento.includes('💪')) s.esHombre = true;
        }
      }
    } catch { /* skip */ }
  }

  const out = new Map<string, ClienteStats>();
  for (const [nombre, s] of acum) {
    let trat = ''; let max = 0;
    for (const [t, c] of s.trats) { if (c > max) { max = c; trat = t; } }
    out.set(nombre, {
      totalTurnos: s.total, presentes: s.pres, ausentes: s.aus,
      tratamientoFrecuente: trat,
      generoDetectado: s.esHombre ? 'm' : 'f',
    });
  }
  return out;
}

// Buscar stats por nombre o por originalNombre (si fue renombrado)
function buscarStats(
  mapa: Map<string, ClienteStats>,
  nombre: string,
  originalNombre?: string,
): ClienteStats {
  const vacio: ClienteStats = { totalTurnos: 0, presentes: 0, ausentes: 0, tratamientoFrecuente: '', generoDetectado: 'f' };
  const low = nombre.toLowerCase();
  const origLow = (originalNombre ?? '').toLowerCase();

  // Buscar exacto
  if (mapa.has(nombre)) return mapa.get(nombre)!;
  if (originalNombre && mapa.has(originalNombre)) return mapa.get(originalNombre)!;

  // Buscar case-insensitive
  for (const [k, v] of mapa) {
    if (k.toLowerCase() === low || k.toLowerCase() === origLow) return v;
  }
  return vacio;
}

// ── Fila compacta — teléfono editable inline ──────────────────────────────
function FilaCliente({ c, onEdit, onDelete, onSaveCelular }: {
  c: ClienteRow;
  onEdit: (c: ClienteRow) => void;
  onDelete: (c: ClienteRow) => void;
  onSaveCelular: (c: ClienteRow, cel: string) => void;
}) {
  const falta = c.ausentes > 0;
  const [tel, setTel] = useState(c.celular);
  const [guardadoLocal, setGuardadoLocal] = useState(false);
  // sincronizar si el dato cambia desde afuera (ej: guardado del servidor)
  useEffect(() => { setTel(c.celular); }, [c.celular]);

  const handleBlur = () => {
    const nuevo = tel.trim();
    if (nuevo !== c.celular) {
      onSaveCelular(c, nuevo);
      setGuardadoLocal(true);
      setTimeout(() => setGuardadoLocal(false), 3000);
    }
  };

  return (
    <div className={`group px-2 py-0.5 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0
      ${falta ? 'bg-red-50/70 dark:bg-red-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>

      {/* Nombre */}
      <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100 shrink-0 min-w-0 truncate" style={{maxWidth:'38%'}}>
        {titleCase(c.nombre)}
      </span>

      {/* Teléfono — siempre editable inline */}
      <input
        value={tel}
        onChange={e => setTel(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder="📱 número"
        inputMode="tel"
        className={`text-[11px] font-mono w-28 shrink-0 px-1 py-0 rounded border transition-colors bg-transparent focus:outline-none focus:ring-1 focus:ring-violet-400 focus:bg-white dark:focus:bg-slate-700
          ${tel
            ? 'text-slate-600 dark:text-slate-300 border-transparent hover:border-slate-300 dark:hover:border-slate-500'
            : 'text-slate-300 dark:text-slate-600 border-dashed border-slate-200 dark:border-slate-700 placeholder:text-slate-300'
          }`}
      />
      {guardadoLocal && <span className="text-[10px] font-bold text-green-600 dark:text-green-400 shrink-0">✓</span>}

      {/* Stats + alertas */}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        {c.totalTurnos > 0 && <span className="text-[10px] text-slate-400">{c.totalTurnos}t</span>}
        {c.presentes > 0   && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">✓{c.presentes}</span>}
        {falta             && <span className="text-[10px] font-bold text-red-500">✗{c.ausentes} ⚠️seña</span>}
        {c.notas && !falta && <span className="text-[10px] text-amber-500 truncate">⚠️{c.notas}</span>}
      </div>

      {/* Acciones */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(c)}   className="text-[10px] text-slate-400 hover:text-blue-500 px-0.5" title="Editar nombre/notas/género">✏️</button>
        <button onClick={() => onDelete(c)} className="text-[10px] text-slate-400 hover:text-red-500 px-0.5"  title="Eliminar">🗑️</button>
      </div>
    </div>
  );
}

// ── Columna ────────────────────────────────────────────────────────────────
function Columna({ titulo, icono, color, items, onEdit, onDelete, onSaveCelular }: {
  titulo: string; icono: string; color: string;
  items: ClienteRow[];
  onEdit: (c: ClienteRow) => void;
  onDelete: (c: ClienteRow) => void;
  onSaveCelular: (c: ClienteRow, cel: string) => void;
}) {
  const [filtro, setFiltro]       = useState('');
  const [filtroTel, setFiltroTel] = useState<'todos' | 'con' | 'sin'>('todos');

  const filtrados = useMemo(() => {
    let lista = items;
    if (filtroTel === 'con') lista = lista.filter(c => !!c.celular);
    if (filtroTel === 'sin') lista = lista.filter(c => !c.celular);
    if (!filtro) return lista;
    const q = filtro.toLowerCase();
    return lista.filter(c => c.nombre.toLowerCase().includes(q) || c.celular.includes(q));
  }, [items, filtro, filtroTel]);

  const conTel   = items.filter(c => c.celular).length;
  const sinTel   = items.length - conTel;
  const ausentes = items.filter(c => c.ausentes > 0).length;
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <div className={`px-3 py-2 border-b border-slate-200 dark:border-slate-700 ${color}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
            {icono} {titulo}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span className="font-semibold">{items.length}</span>
            <span className="text-emerald-600">📱{conTel}</span>
            {sinTel > 0 && <span className="text-amber-500 font-bold">⚠️{sinTel}</span>}
            {ausentes > 0 && <span className="text-red-500 font-bold">🚫{ausentes}</span>}
          </div>
        </div>

        {/* Filtro rápido por celular */}
        <div className="flex gap-1 mb-1.5">
          {(['todos', 'con', 'sin'] as const).map(v => (
            <button
              key={v}
              onClick={() => setFiltroTel(v)}
              className={`flex-1 py-0.5 rounded-lg text-[10px] font-bold transition-colors ${
                filtroTel === v
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}
            >
              {v === 'todos' ? `Todos (${items.length})` : v === 'con' ? `📱 Con (${conTel})` : `⚠️ Sin (${sinTel})`}
            </button>
          ))}
        </div>

        <input
          value={filtro} onChange={e => setFiltro(e.target.value)}
          placeholder={`Buscar ${titulo.toLowerCase()}...`}
          className="w-full px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
        {filtrados.length === 0
          ? <p className="text-center py-6 text-[11px] text-slate-400">{filtro || filtroTel !== 'todos' ? 'Sin resultados' : 'Sin registros'}</p>
          : filtrados.map(c => (
              <FilaCliente key={c.id} c={c} onEdit={onEdit} onDelete={onDelete} onSaveCelular={onSaveCelular} />
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

  const [editId, setEditId]           = useState<string | null>(null);
  const [editNombre, setEditNombre]   = useState('');
  const [editCelular, setEditCelular] = useState('');
  const [editNotas, setEditNotas]     = useState('');
  const [editGenero, setEditGenero]   = useState<'m' | 'f'>('f');

  // Ref siempre actualizado — evita stale closure
  const serverRef = useRef<ClienteData[]>([]);
  useEffect(() => { serverRef.current = serverClientes; }, [serverClientes]);

  // Lista negra: nombres borrados por la usuaria que no deben volver aunque estén en localStorage
  const [blacklist, setBlacklist] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ganesha_clientes_borrados');
      if (raw) setBlacklist(new Set(JSON.parse(raw) as string[]));
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { setStatsMap(calcularStatsLS()); }, []);

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => r.json())
      .then((d: { ok: boolean; datos?: ClienteData[] }) => {
        if (d.ok && Array.isArray(d.datos) && d.datos.length > 0) {
          setServerClientes(d.datos);
          // Backup local — copia de seguridad cada vez que el servidor tiene datos
          try { localStorage.setItem('ganesha_clientes_backup', JSON.stringify(d.datos)); } catch { /* silencioso */ }
        } else {
          // Servidor vacío — restaurar desde backup local automáticamente
          try {
            const raw = localStorage.getItem('ganesha_clientes_backup');
            if (raw) {
              const backup = JSON.parse(raw) as ClienteData[];
              if (Array.isArray(backup) && backup.length > 0) {
                setServerClientes(backup);
                // Restaurar al servidor sin intervención del usuario
                fetch('/api/clientes', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ datos: backup }),
                }).catch(() => {});
              }
            }
          } catch { /* silencioso */ }
        }
      })
      .catch(() => {});
  }, []);

  // Mezclar server + localStorage
  const rows = useMemo((): ClienteRow[] => {
    const byLow = new Map(serverClientes.map(c => [c.nombre.toLowerCase(), c]));
    // También indexar por originalNombre
    for (const c of serverClientes) {
      if (c.originalNombre) byLow.set(c.originalNombre.toLowerCase(), c);
    }

    // Extra: clientes solo en localStorage, excluyendo borrados
    const extra: ClienteData[] = [];
    for (const [nombre, stats] of statsMap) {
      const low = nombre.toLowerCase();
      if (!byLow.has(low) && !blacklist.has(low)) {
        extra.push({ id: `ls_${nombre}`, nombre, celular: '', notas: '', genero: stats.generoDetectado });
      }
    }

    return [
      // Clientes del servidor — siempre se muestran (aunque no tengan turnos aún)
      ...serverClientes.map(c => {
        const stats = buscarStats(statsMap, c.nombre, c.originalNombre);
        return {
          ...c,
          // Si no tiene genero explícito, usar el detectado del tratamiento
          genero: c.genero ?? stats.generoDetectado,
          ...stats,
        } as ClienteRow;
      }),
      // Clientes solo de localStorage — solo si tienen turnos
      ...extra.map(c => ({
        ...c,
        ...buscarStats(statsMap, c.nombre),
      } as ClienteRow)).filter(c => c.totalTurnos > 0),
    ].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [serverClientes, statsMap, blacklist]);

  const mujeres = rows.filter(c => c.genero !== 'm');
  const hombres = rows.filter(c => c.genero === 'm');

  const persistir = useCallback(async (lista: ClienteData[]) => {
    // Backup inmediato en localStorage antes de enviar al servidor
    try { localStorage.setItem('ganesha_clientes_backup', JSON.stringify(lista)); } catch { /* silencioso */ }
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
  }, []);

  const abrirEdit = useCallback((c: ClienteRow) => {
    setEditId(c.id);
    setEditNombre(c.nombre);
    setEditCelular(c.celular);
    setEditNotas(c.notas);
    setEditGenero(c.genero ?? c.generoDetectado ?? 'f');
  }, []);

  const guardarEdit = useCallback(async () => {
    if (!editId) return;
    const actual = serverRef.current;

    // Buscar el cliente existente por id (puede ser ls_ o uuid)
    const existente = actual.find(x => x.id === editId);
    // Para ls_ que aún no están en server, buscar por nombre original
    const nombreOriginal = editId.startsWith('ls_')
      ? editId.replace(/^ls_/, '')
      : (existente?.originalNombre ?? existente?.nombre ?? editNombre);

    const updated: ClienteData = {
      id:             editId.startsWith('ls_') ? crypto.randomUUID() : editId,
      nombre:         editNombre.trim() || nombreOriginal,
      originalNombre: nombreOriginal !== (editNombre.trim() || nombreOriginal)
                        ? nombreOriginal  // guardar nombre original si fue renombrado
                        : undefined,
      celular:        editCelular.trim(),
      notas:          editNotas.trim(),
      genero:         editGenero,
    };

    // Quitar el registro anterior (por id O por nombre original)
    const sin = actual.filter(x =>
      x.id !== editId &&
      x.nombre.toLowerCase() !== nombreOriginal.toLowerCase()
    );
    const nueva = [...sin, updated];

    setServerClientes(nueva);
    serverRef.current = nueva;
    setEditId(null);
    await persistir(nueva);
  }, [editId, editNombre, editCelular, editNotas, editGenero, persistir]);

  const eliminar = useCallback(async (c: ClienteRow) => {
    // 1. Agregar a lista negra para que no vuelva desde localStorage
    const nuevaBlacklist = new Set([
      ...blacklist,
      c.nombre.toLowerCase(),
      ...(c.originalNombre ? [c.originalNombre.toLowerCase()] : []),
    ]);
    setBlacklist(nuevaBlacklist);
    try { localStorage.setItem('ganesha_clientes_borrados', JSON.stringify([...nuevaBlacklist])); } catch { /* silencioso */ }

    // 2. Quitar del servidor
    const nueva = serverRef.current.filter(x =>
      x.id !== c.id &&
      x.nombre.toLowerCase() !== c.nombre.toLowerCase()
    );
    setServerClientes(nueva);
    serverRef.current = nueva;
    await persistir(nueva);
  }, [blacklist, persistir]);

  // Guardar solo el teléfono sin abrir el modal (edición inline en la fila)
  const guardarCelularInline = useCallback(async (c: ClienteRow, celular: string) => {
    const actual = serverRef.current;
    const existente = actual.find(x => x.id === c.id);
    const updated: ClienteData = existente
      ? { ...existente, celular }
      : {
          id:             c.id.startsWith('ls_') ? crypto.randomUUID() : c.id,
          nombre:         c.nombre,
          originalNombre: c.originalNombre,
          celular,
          notas:          c.notas,
          genero:         c.genero,
        };
    const sin   = actual.filter(x => x.id !== c.id && x.nombre.toLowerCase() !== c.nombre.toLowerCase());
    const nueva = [...sin, updated];
    setServerClientes(nueva);
    serverRef.current = nueva;
    await persistir(nueva);
  }, [persistir]);

  const agregarManual = () => {
    const id = crypto.randomUUID();
    setEditId(id); setEditNombre(''); setEditCelular(''); setEditNotas(''); setEditGenero('f');
  };

  return (
    <div className="space-y-3">

      {/* Encabezado */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold">👥 Clientes</h2>
          <p className="text-[11px] text-slate-400">
            {rows.length} total · {mujeres.length} mujeres · {hombres.length} hombres
            {rows.filter(c => c.ausentes > 0).length > 0 && (
              <> · <span className="text-red-500 font-semibold">
                ⚠️ {rows.filter(c => c.ausentes > 0).length} con ausencias
              </span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {estado === 'ok'    && <span className="text-[11px] text-emerald-600 dark:text-emerald-400">✓ guardado</span>}
          {estado === 'error' && <span className="text-[11px] text-red-500">✗ error</span>}
          {guardando          && <span className="text-[11px] text-slate-400">guardando…</span>}
          {rows.length > 0 && (
            <>
              <button onClick={() => descargarContactosTxt(rows)}
                className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium transition-colors">
                📋 TXT
              </button>
              <button onClick={() => descargarContactosWhatsapp(rows)}
                className="px-2 py-1 text-xs rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 font-medium transition-colors">
                💬 WhatsApp
              </button>
            </>
          )}
          <button onClick={agregarManual}
            className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 font-medium">
            + Nuevo
          </button>
        </div>
      </div>

      {/* Modal edición */}
      {editId && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 space-y-2">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Editar contacto</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center">
            <input value={editNombre}  onChange={e => setEditNombre(e.target.value)}
              placeholder="Nombre completo"
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
            <input value={editCelular} onChange={e => setEditCelular(e.target.value)}
              placeholder="📱 Celular" inputMode="tel"
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-mono" />
            <input value={editNotas}   onChange={e => setEditNotas(e.target.value)}
              placeholder="Notas"
              className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700" />
            {/* Género */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 shrink-0">Género:</span>
              <button onClick={() => setEditGenero('f')}
                className={`px-2 py-0.5 text-xs rounded font-bold transition-colors ${editGenero === 'f' ? 'bg-pink-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                F
              </button>
              <button onClick={() => setEditGenero('m')}
                className={`px-2 py-0.5 text-xs rounded font-bold transition-colors ${editGenero === 'm' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                M
              </button>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditId(null)}
              className="px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200">Cancelar</button>
            <button onClick={guardarEdit}
              className="px-3 py-0.5 text-xs rounded bg-blue-600 text-white font-semibold hover:bg-blue-700">Guardar</button>
          </div>
        </div>
      )}

      {/* Dos columnas */}
      <div className="grid grid-cols-2 gap-3">
        <Columna titulo="Mujeres" icono="👩" color="bg-pink-50/50 dark:bg-pink-900/10"
          items={mujeres} onEdit={abrirEdit} onDelete={eliminar} onSaveCelular={guardarCelularInline} />
        <Columna titulo="Hombres" icono="👨" color="bg-blue-50/50 dark:bg-blue-900/10"
          items={hombres} onEdit={abrirEdit} onDelete={eliminar} onSaveCelular={guardarCelularInline} />
      </div>

    </div>
  );
}
