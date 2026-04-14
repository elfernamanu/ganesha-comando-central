export default function Loading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-slate-950 z-50">
      {/* Logo / nombre */}
      <div className="mb-6 text-center">
        <div className="text-5xl mb-3">🌸</div>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          Ganesha Esthetic
        </p>
        <p className="text-xs text-slate-400 mt-1">Cargando...</p>
      </div>

      {/* Spinner */}
      <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
}
