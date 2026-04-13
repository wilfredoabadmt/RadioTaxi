import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import Head from 'next/head';
import { 
  Navigation, 
  Map as MapIcon, 
  Users, 
  Clock, 
  TrendingUp, 
  Bell, 
  Settings, 
  Search,
  Activity,
  History,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Componentes sutiles (pueden ser extraídos luego)
const StatCard = ({ title, value, icon: Icon, color, trend }: any) => (
  <motion.div 
    whileHover={{ scale: 1.02, translateY: -5 }}
    className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-5 rounded-2xl flex flex-col gap-3"
  >
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl bg-${color}-500/10`}>
        <Icon className={`w-6 h-6 text-${color}-400`} />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}>
          +{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-zinc-400 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-white mt-1 font-outfit tracking-tight">{value}</h3>
    </div>
  </motion.div>
);

export default function DispatchDashboard() {
  const [apiStatus, setApiStatus] = useState<'Checking' | 'Online' | 'Offline'>('Checking');
  const [socketStatus, setSocketStatus] = useState<'Disconnected' | 'Connected'>('Disconnected');
  const [activeRequests, setActiveRequests] = useState<any[]>([]);

  useEffect(() => {
    // Simulación de conexión a servicios
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3002';

    fetch(`${apiUrl}/api`)
      .then(() => setApiStatus('Online'))
      .catch(() => setApiStatus('Offline'));

    const socket = io(realtimeUrl);
    socket.on('connect', () => setSocketStatus('Connected'));
    socket.on('disconnect', () => setSocketStatus('Disconnected'));

    return () => { socket.disconnect(); };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-amber-500/30">
      <Head>
        <title>RadioTaxi | Dispatch Master Control</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
      </Head>

      {/* Header Premium */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-[1800px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Navigation className="text-black fill-current w-6 h-6" />
              </div>
              <h1 className="text-2xl font-outfit font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                RadioTaxi <span className="text-amber-500">Dispatch</span>
              </h1>
            </div>
            
            <nav className="hidden xl:flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
              {['Visión General', 'Flota', 'Viajes', 'Operadoras'].map((item, idx) => (
                <button key={item} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${idx === 0 ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}>
                  {item}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800">
              <div className={`w-2 h-2 rounded-full ${apiStatus === 'Online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animation-pulse'}`} />
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">API {apiStatus}</span>
            </div>
            <button className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-500 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-zinc-900" />
            </button>
            <div className="h-10 w-[1px] bg-zinc-800 mx-1" />
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white leading-none">Admin Central</p>
                <p className="text-xs text-zinc-500 mt-1">Super Administrador</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-[1px]">
                <div className="w-full h-full rounded-xl bg-zinc-900 flex items-center justify-center overflow-hidden">
                   <Users className="text-zinc-400 w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 pt-28 pb-12">
        
        {/* Grilla de KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Solicitudes Hoy" value="248" icon={Clock} color="amber" trend="12" />
          <StatCard title="Unidades Activas" value="45" icon={Navigation} color="emerald" trend="5" />
          <StatCard title="Ingresos Netos" value="$1,240.50" icon={TrendingUp} color="blue" />
          <StatCard title="Tiempo de Respuesta" value="3.5 min" icon={Activity} color="rose" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Panel Lateral: Solicitudes en Tiempo Real */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-3xl overflow-hidden flex flex-col h-[700px]">
              <div className="p-6 border-b border-zinc-800/60 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500">
                    <History className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold">Solicitudes Pendientes</h2>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded bg-zinc-800 text-zinc-400 uppercase tracking-widest">Live</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <AnimatePresence>
                  {activeRequests.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-full text-zinc-500 opacity-60 px-8 text-center"
                    >
                      <div className="p-5 rounded-full bg-zinc-900 mb-4 border border-zinc-800">
                        <AlertCircle className="w-8 h-8 text-zinc-600" />
                      </div>
                      <p className="text-sm font-medium">Buscando solicitudes entrantes...</p>
                      <p className="text-xs mt-2">La consola se actualizará automáticamente cuando un pasajero realice un pedido.</p>
                    </motion.div>
                  ) : (
                    activeRequests.map((req) => (
                      <motion.div 
                        key={req.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-zinc-800/40 border border-zinc-700/50 p-4 rounded-2xl mb-3 hover:border-amber-500/50 transition-colors group cursor-pointer"
                      >
                         <div className="flex justify-between items-start mb-3">
                            <div>
                               <p className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Ahora
                               </p>
                               <h4 className="font-bold text-white mt-0.5">{req.passenger}</h4>
                            </div>
                            <span className="text-xs font-mono bg-zinc-900 px-2 py-1 rounded text-zinc-400">#TRXP-45</span>
                         </div>
                         <div className="flex items-center gap-3 text-sm text-zinc-400">
                            <MapIcon className="w-4 h-4 shrink-0" />
                            <p className="truncate truncate-1-line">{req.pickupAddress}</p>
                         </div>
                         <div className="mt-4 pt-4 border-t border-zinc-700/30 flex gap-2">
                            <button className="flex-1 bg-amber-500 text-black py-2 rounded-xl text-xs font-bold hover:bg-amber-400 transition-colors">DESPACHAR</button>
                            <button className="px-3 bg-zinc-800 text-zinc-400 py-2 rounded-xl text-xs font-bold hover:text-white hover:bg-zinc-700 transition-colors">VER</button>
                         </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </section>
          </div>

          {/* Panel Central: Mapa Maestro con Glassmorphism Overlays */}
          <div className="lg:col-span-2 relative">
            <div className="h-[700px] w-full rounded-3xl overflow-hidden border border-zinc-800/60 bg-zinc-900 group shadow-2xl relative">
              
              {/* Overlay: Mapa informativo */}
              <div className="absolute top-6 left-6 z-10 w-fit">
                 <div className="bg-[#050505]/60 backdrop-blur-xl border border-white/5 p-4 rounded-2xl flex items-center gap-4 shadow-xl">
                    <div className="flex -space-x-2">
                       {[1,2,3].map(i => (
                         <div key={i} className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center">
                            <Users className="w-3 h-3 text-zinc-500" />
                         </div>
                       ))}
                    </div>
                    <div className="h-6 w-[1px] bg-white/10" />
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">Unidades Libres</span>
                       <span className="text-sm font-bold text-white">12 Conductores</span>
                    </div>
                 </div>
              </div>

              {/* Integración del Mapa Placeholder con estética Premium */}
              <div className="w-full h-full bg-[#111111] flex flex-col items-center justify-center opacity-40">
                <div className="relative">
                   <div className="absolute inset-0 bg-amber-500/20 blur-[100px] rounded-full" />
                   <MapIcon className="w-24 h-24 text-zinc-800 relative z-10" />
                </div>
                <h3 className="text-xl font-bold mt-6 text-zinc-600 tracking-tight">Mapa Dinámico</h3>
                <p className="text-zinc-700 mt-2 font-medium">Renderizando mapa interactivo en tiempo real...</p>
              </div>

              {/* Botones de Control Flotantes */}
              <div className="absolute bottom-6 right-6 z-10 flex flex-col gap-3">
                 <button className="w-12 h-12 rounded-2xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all hover:border-amber-500/30">
                    <ShieldCheck className="w-6 h-6" />
                 </button>
                 <button className="w-12 h-12 rounded-2xl bg-amber-500 border border-amber-400 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                    <Settings className="w-6 h-6 text-black" />
                 </button>
              </div>

            </div>
          </div>

        </div>
      </main>

      <style jsx global>{`
        body {
          background-color: #050505;
          font-family: 'Inter', sans-serif;
        }
        .font-outfit {
          font-family: 'Outfit', sans-serif;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animation-pulse {
          animation: pulse 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
