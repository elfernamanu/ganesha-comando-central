export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors duration-300">
      {/* Header Admin */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold">⚙️ Panel de Administración</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Configura disponibilidad, servicios y promociones
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {children}
      </div>
    </div>
  );
}
