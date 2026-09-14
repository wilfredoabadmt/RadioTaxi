import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { Socket } from 'socket.io-client';
import SectionCard from '../components/SectionCard';
import MapPlaceholder from '../components/MapPlaceholder';

const getApiBaseUrl = () => {
  // En producción en el navegador, usar el proxy interno de Next.js (/api-proxy)
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

const getRealtimeUrl = () => {
  const raw = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3002';
  let url = raw.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    url = url.replace(/^http:\/\//i, 'https://');
  }
  return url;
};

const Home = () => {
  const [tripRequests, setTripRequests] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Estados de despacho asistido por IA y selección de vehículos
  const [selectedVehicles, setSelectedVehicles] = useState<Record<number, number>>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<number, any>>({});
  const [loadingAi, setLoadingAi] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      if (!token) {
        router.push('/login');
      } else {
        setIsAuthenticated(true);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        setLoadingAuth(false);
      }
    }
  }, [router]);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const baseUrl = getApiBaseUrl();
      const headers = { 'Authorization': `Bearer ${token}` };
      const [tripsRes, vehiclesRes, reportsRes] = await Promise.all([
        fetch(`${baseUrl}/trip-requests`, { headers }),
        fetch(`${baseUrl}/vehicles`, { headers }),
        fetch(`${baseUrl}/reports`, { headers })
      ]);

      if (!tripsRes.ok || !vehiclesRes.ok || !reportsRes.ok) {
        throw new Error('Error al obtener datos del servidor');
      }

      setTripRequests(await tripsRes.json());
      setVehicles(await vehiclesRes.json());
      setReports(await reportsRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const assignTrip = (tripRequestId: number, vehicleId: number) => {
    if (socket && vehicleId) {
      socket.emit('trip:assign', { tripRequestId, vehicleId });
    }
  };

  const completeTrip = (vehicleId: number) => {
    if (socket) {
      socket.emit('trip:complete', { vehicleId });
    }
  };

  // Solicitar sugerencia de despacho asistido por IA a Google Gemini
  const requestAiSuggestion = async (request: any) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingAi(prev => ({ ...prev, [request.id]: true }));
    try {
      const baseUrl = getApiBaseUrl();
      const availableVehicles = vehicles.filter(v => v.status === 'available');
      const res = await fetch(`${baseUrl}/ai/dispatch/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          tripRequest: request,
          vehicles: availableVehicles
        })
      });

      if (res.ok) {
        const suggestion = await res.json();
        setAiSuggestions(prev => ({ ...prev, [request.id]: suggestion }));
        if (suggestion.recommendedVehicleId) {
          setSelectedVehicles(prev => ({ ...prev, [request.id]: suggestion.recommendedVehicleId }));
        }
      }
    } catch (err) {
      console.error('Error al invocar despacho IA:', err);
    } finally {
      setLoadingAi(prev => ({ ...prev, [request.id]: false }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window === 'undefined') return;

    let socketInstance: Socket | null = null;
    const token = localStorage.getItem('token');

    import('socket.io-client').then(({ io }) => {
      socketInstance = io(getRealtimeUrl(), {
        auth: { token }
      });
      setSocket(socketInstance);

      socketInstance.on('connect', () => {
        console.log('Conectado al servicio de tiempo real');
        setRealtimeConnected(true);
      });

      socketInstance.on('disconnect', () => {
        console.log('Desconectado del servicio de tiempo real');
        setRealtimeConnected(false);
      });

      socketInstance.on('vehicles:update', (updatedVehicles) => {
        setVehicles(updatedVehicles);
      });

      socketInstance.on('trip-requests:update', (updatedRequests) => {
        setTripRequests(updatedRequests);
      });

      socketInstance.on('trip:assigned', (data) => {
        setTripRequests(prev => prev.filter(req => req.id !== data.tripRequestId));
      });
    });

    return () => {
      socketInstance?.disconnect();
    };
  }, [isAuthenticated]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const availableVehicles = vehicles.filter(v => v.status === 'available');

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Navbar */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚕</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                RadioTaxi <span className="text-indigo-600">SaaS Dispatch</span>
              </h1>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs font-semibold">
              <span className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 ${realtimeConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                <span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {realtimeConnected ? 'Telemetría en Vivo Conectada' : 'Realtime Desconectado'}
              </span>
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full">
                API: {loading ? 'Sincronizando...' : 'Online'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800">{user.email}</p>
                <p className="text-xs text-indigo-600 font-semibold uppercase">{user.role}</p>
              </div>
            )}
            <button
              onClick={fetchData}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition"
            >
              🔄 Actualizar
            </button>
            <button
              onClick={handleLogout}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Solicitudes Pendientes</p>
            <p className="text-4xl font-black text-indigo-600 mt-2">{tripRequests.length}</p>
            <p className="text-xs text-slate-500 mt-1">En cola de despacho</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vehículos en Flota</p>
            <p className="text-4xl font-black text-emerald-600 mt-2">
              {availableVehicles.length} <span className="text-sm font-semibold text-slate-400">/ {vehicles.length} disp.</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Monitoreados por telemetría GPS</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Despacho Asistido</p>
            <p className="text-2xl font-black text-amber-500 mt-2 flex items-center gap-1">
              <span>✨ Gemini AI</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">Optimización por distancia y tiempo</p>
          </div>
        </div>

        {/* Mapa en vivo */}
        <SectionCard title="Mapa Operativo de Telemetría GPS" description="Ubicación en tiempo real de vehículos y puntos de recogida en La Paz.">
          <MapPlaceholder tripRequests={tripRequests} vehicles={vehicles} />
        </SectionCard>

        {/* Cola de solicitudes con despacho asistido por IA */}
        <SectionCard title="Cola de Solicitudes de Viaje" description="Asigna vehículos manual o inteligentemente con sugerencias de IA.">
          {tripRequests.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <span className="text-4xl">🚕</span>
              <p className="text-base font-semibold text-slate-700 mt-2">No hay solicitudes pendientes en este momento</p>
              <p className="text-xs text-slate-400">Las solicitudes emitidas por la app de clientes aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tripRequests.map((request) => {
                const suggestion = aiSuggestions[request.id];
                const isAiLoading = loadingAi[request.id];
                const selectedVehicleId = selectedVehicles[request.id] || '';

                return (
                  <div key={request.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 hover:border-indigo-300 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
                          Solicitud #{request.id}
                        </span>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(request.requestedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="text-xs font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                        {request.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <p className="flex items-center gap-2 text-slate-800 font-medium">
                        <span>📍</span> <span className="truncate">{request.originAddress || 'Origen por coordenadas'}</span>
                      </p>
                      <p className="flex items-center gap-2 text-slate-600 text-xs">
                        <span>🏁</span> <span className="truncate">{request.destinationAddress || 'Destino no especificado'}</span>
                      </p>
                    </div>

                    {/* Caja de sugerencia IA si está disponible */}
                    {suggestion && (
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-indigo-950">
                          <span className="flex items-center gap-1">✨ Recomendación IA ({suggestion.source}):</span>
                          <span>Vehículo #{suggestion.recommendedVehicleId}</span>
                        </div>
                        <p className="text-indigo-800">{suggestion.reason}</p>
                      </div>
                    )}

                    {/* Controles de asignación */}
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicles(prev => ({ ...prev, [request.id]: parseInt(e.target.value) }))}
                        className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Seleccionar vehículo ({availableVehicles.length} disponibles)</option>
                        {availableVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            🚗 {v.plate} ({v.brand || 'Vehículo'} {v.model || ''})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => requestAiSuggestion(request)}
                        disabled={isAiLoading || availableVehicles.length === 0}
                        className="bg-purple-100 hover:bg-purple-200 text-purple-900 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {isAiLoading ? 'Analizando...' : '✨ Sugerir con IA'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const vId = selectedVehicles[request.id];
                          if (vId) assignTrip(request.id, vId);
                        }}
                        disabled={!selectedVehicles[request.id]}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
                      >
                        Asignar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Flota de vehículos */}
        <SectionCard title="Estado Operativo de la Flota" description="Vehículos disponibles y en ruta con telemetría.">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{vehicle.plate}</p>
                  <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model} ({vehicle.vehicleType || 'sedan'})</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    vehicle.status === 'available' ? 'bg-emerald-100 text-emerald-800' :
                    vehicle.status === 'busy' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {vehicle.status}
                  </span>
                </div>
                {vehicle.status === 'busy' && (
                  <button
                    onClick={() => completeTrip(vehicle.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                  >
                    Completar
                  </button>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
};

export default Home;
