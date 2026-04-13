import { DrawerMain } from '@/components/Drawer/DrawerMain';

export default function PCLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors duration-300">
      <div className="flex h-screen">
        {/* Sidebar — solo visible en PC */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-slate-200 dark:border-slate-700">
          <DrawerMain />
        </div>
        {/* Contenido principal */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
