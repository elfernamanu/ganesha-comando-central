import Link from 'next/link';

export default function CajaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <Link
        href="/admin/panel-control"
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        ← Volver al Panel
      </Link>

      {children}
    </div>
  );
}
