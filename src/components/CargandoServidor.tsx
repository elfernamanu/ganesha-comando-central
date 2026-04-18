'use client';

export default function CargandoServidor({ seccion }: { seccion?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div className="text-center">
        <p className="text-xl font-black text-violet-700 dark:text-violet-300 tracking-wide uppercase">
          Ganesha Esthetic
        </p>
        {seccion && (
          <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-wider">{seccion}</p>
        )}
      </div>
      <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      <div className="text-center">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          Cargando datos del servidor...
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Esperando confirmación antes de mostrar
        </p>
      </div>
    </div>
  );
}
