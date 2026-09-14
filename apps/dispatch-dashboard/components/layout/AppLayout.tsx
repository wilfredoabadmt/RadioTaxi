import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  realtimeConnected?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
}

export default function AppLayout({
  children,
  title = 'RadioTaxi SaaS | Centro de Despacho',
  realtimeConnected = false,
  onRefresh,
  loading = false,
}: AppLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!token) {
        router.replace('/login');
      } else {
        setIsAuthenticated(true);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            setUser(null);
          }
        }
      }
    }
  }, [router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-lg shadow-xl shadow-cyan-500/30 animate-pulse">
          RT
        </div>
        <p className="mt-4 text-xs font-mono text-cyan-400 tracking-wider">VERIFICANDO SESIÓN DE OPERADOR...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
        {/* Navegación Lateral */}
        <Sidebar />

        {/* Área Principal de Contenido */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar
            user={user}
            realtimeConnected={realtimeConnected}
            onRefresh={onRefresh}
            loading={loading}
          />

          <main className="flex-1 overflow-y-auto p-6 bg-radial-gradient">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
