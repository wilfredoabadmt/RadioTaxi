import { useRouter } from 'next/router';

interface TopbarProps {
  user: any;
  realtimeConnected?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function Topbar({ user, realtimeConnected = false, onRefresh, loading = false }: TopbarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'DISPATCHER':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <header className="h-16 bg-slate-950/80 border-b border-slate-800/80 px-6 flex items-center justify-between backdrop-blur-xl shrink-0 z-10">
      {/* Indicador de Estado Realtime */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
          <span className="relative flex h-2.5 w-2.5">
            {realtimeConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                realtimeConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="font-mono text-slate-300 text-[11px]">
            {realtimeConnected ? 'SOCKET: CONECTADO' : 'SOCKET: RECONECTANDO...'}
          </span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs hover:text-white transition-all disabled:opacity-50"
            title="Refrescar datos"
          >
            <svg
              className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        )}
      </div>

      {/* Perfil de Usuario & Cerrar Sesión */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs border border-white/10 shadow-sm">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RT'}
          </div>
          <div className="hidden sm:block text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">{user?.name || 'Usuario Demo'}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${getRoleBadge(
                  user?.role
                )}`}
              >
                {user?.role || 'OPERADOR'}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block leading-tight">{user?.email || 'demo@radiotaxi.bo'}</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          title="Cerrar sesión"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
