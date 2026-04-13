'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShiftsGrid } from '@/components/MainContent/ShiftsGrid';

export default function WebPage() {
  const router = useRouter();
  const today = new Date();
  const dateStr = today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  useEffect(() => {
    // Detecta si es desktop y redirige a /
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        router.push('/');
      }
    };

    handleResize(); // Chequea al cargar
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [router]);

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
        <button className="px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium">← Ayer</button>
        <span className="font-semibold text-blue-600 text-sm">{dateStr}</span>
        <button className="px-3 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium">Mañana →</button>
      </div>
      <ShiftsGrid />
    </div>
  );
}
