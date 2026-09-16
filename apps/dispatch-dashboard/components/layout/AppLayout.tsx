import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { io as createSocketClient, Socket } from 'socket.io-client';
import { getRealtimeUrl, handleAuthExpired } from '../../utils/api';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import IncomingCallModal from '../telephony/IncomingCallModal';

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
  const [activeCall, setActiveCall] = useState<any | null>(null);
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

  // Escucha de llamadas entrantes vía Socket en segundo plano
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const realtimeUrl = getRealtimeUrl();
    let socket: Socket | null = null;

    try {
      socket = createSocketClient(realtimeUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      socket.on('connect_error', (err: any) => {
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('unauthorized') || msg.includes('jwt') || msg.includes('token') || err?.data?.status === 401) {
          handleAuthExpired();
        }
      });

      socket.on('call:incoming', (callData: any) => {
        console.log('[AppLayout] 📞 Alerta de llamada entrante recibida:', callData);
        setActiveCall(callData);
      });

      socket.on('call:ended', (endedData: any) => {
        setActiveCall((curr: any) => (curr?.callUuid === endedData?.callUuid ? null : curr));
      });
    } catch (err) {
      console.error('[AppLayout] Error conectando socket de llamadas:', err);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [isAuthenticated]);

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

        {/* Modal Pop-up de Llamada Entrante con 1-Click Despacho */}
        {activeCall && (
          <IncomingCallModal
            call={activeCall}
            onClose={() => setActiveCall(null)}
            onTripCreated={(createdTrip) => {
              if (onRefresh) onRefresh();
              router.push('/');
            }}
          />
        )}
      </div>
    </>
  );
}
