'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get('from') || '/admin/panel-control';

  const [pin, setPin]           = useState('');
  const [error, setError]       = useState('');
  const [cargando, setCargando] = useState(false);
  const [checking, setChecking] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Si no hay PIN requerido, redirigir directo
  useEffect(() => {
    fetch('/api/panel-auth')
      .then(r => r.json())
      .then(d => {
        if (!d.pinRequerido) router.replace(destino);
        else { setChecking(false); setTimeout(() => inputRef.current?.focus(), 100); }
      })
      .catch(() => setChecking(false));
  }, [destino, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setCargando(true);
    setError('');
    try {
      const res = await fetch('/api/panel-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.ok) {
        router.replace(destino);
      } else {
        setError('PIN incorrecto');
        setPin('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-xs">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-3">🔒</div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Panel de Control</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Ingresá el PIN para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(''); }}
              placeholder="• • • •"
              maxLength={8}
              className="w-full text-center text-2xl font-bold tracking-widest px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
            />

            {error && (
              <p className="text-center text-sm font-semibold text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={cargando || !pin.trim()}
              className="w-full py-3 rounded-2xl bg-violet-600 text-white font-bold text-base hover:bg-violet-700 disabled:opacity-50 transition active:scale-[0.98]"
            >
              {cargando ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
