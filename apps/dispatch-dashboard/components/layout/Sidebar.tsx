import Link from 'next/link';
import { useRouter } from 'next/router';

interface NavItem {
  name: string;
  href: string;
  icon: (active: boolean) => JSX.Element;
  badge?: string;
}

export default function Sidebar() {
  const router = useRouter();

  const navItems: NavItem[] = [
    {
      name: 'Despacho en Vivo',
      href: '/',
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      badge: 'LIVE',
    },
    {
      name: 'Gestión de Flota',
      href: '/fleet',
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      name: 'Historial de Viajes',
      href: '/trips',
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      name: 'Tarifas y Geocercas',
      href: '/pricing',
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: 'Métricas y Reportes',
      href: '/reports',
      icon: (active) => (
        <svg className={`w-5 h-5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-64 bg-slate-950/90 border-r border-slate-800/80 flex flex-col backdrop-blur-xl shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800/60 gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center font-black text-white shadow-lg shadow-cyan-500/20 text-sm tracking-wider">
          RT
        </div>
        <div>
          <span className="font-extrabold text-white text-base tracking-tight block">
            RadioTaxi <span className="text-cyan-400 font-medium text-xs uppercase px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-500/30">SaaS</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-wider block uppercase">
            SDD Enterprise Stack
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
          Operaciones Principales
        </div>
        {navItems.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="transition-transform group-hover:scale-110">
                  {item.icon(isActive)}
                </span>
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-900/30">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-slate-300 font-medium">Gateway SDD v1.0</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">La Paz (BOB)</span>
        </div>
      </div>
    </aside>
  );
}
