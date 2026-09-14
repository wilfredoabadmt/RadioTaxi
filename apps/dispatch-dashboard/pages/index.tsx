import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Socket } from 'socket.io-client';
import AppLayout from '../components/layout/AppLayout';
import MapPlaceholder from '../components/MapPlaceholder';

// Cargar mapa Leaflet en el cliente para evitar problemas de SSR
const DispatchMapClient = dynamic(() => import('../components/DispatchMapClient'), {
  ssr: false,
  loading: () => <MapPlaceholder tripRequests={[]} vehicles={[]} />,
});

const getApiBaseUrl = () => {
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

export default function Home() {
  const [tripRequests, setTripRequests] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Estados de despacho asistido por IA
  const [selectedVehicles, setSelectedVehicles] = useState<Record<number, number>>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<number, any>>({});
  const [loadingAi, setLoadingAi] = useState<Record<number, boolean>>({});

  const fetchData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const baseUrl = getApiBaseUrl();
      const headers = { Authorization: `Bearer ${token}` };
      const [tripsRes, vehiclesRes] = await Promise.all([
        fetch(`${baseUrl}/trip-requests`, { headers }),
        fetch(`${baseUrl}/vehicles`, { headers }),
      ]);

      if (!tripsRes.ok || !vehiclesRes.ok) {
        throw new Error('Error al sincronizar datos del servidor');
      }

      setTripRequests(await tripsRes.json());
      setVehicles(await vehiclesRes.json());
    } catch (err: any) {
      setError(err?.message || 'Error desconocido al conectar con la API');
    } finally {
      setLoading(false);
    }
  };

  const assignTrip = (tripRequestId: number, vehicleId: number) => {
    if (socket && vehicleId) {
      socket.emit('trip:assign', { tripRequestId, vehicleId });
      // Remover optimista
      setTripRequests((prev) => prev.filter((r) => r.id !== tripRequestId));
    }
  };

  const completeTrip = (vehicleId: number) => {
    if (socket) {
      socket.emit('trip:complete', { vehicleId });
      fetchData();
    }
  };

  // Solicitar sugerencia de despacho asistido por IA a Google Gemini
  const requestAiSuggestion = async (request: any) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingAi((prev) => ({ ...prev, [request.id]: true }));
    try {
      const baseUrl = getApiBaseUrl();
      const availableVehicles = vehicles.filter((v) => v.status === 'available');

      const res = await fetch(`${baseUrl}/ai/dispatch/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripRequest: request,
          vehicles: availableVehicles,
        }),
      });

      if (res.ok) {
        const suggestion = await res.json();
        setAiSuggestions((prev) => ({ ...prev, [request.id]: suggestion }));
        if (suggestion.recommendedVehicleId) {
          setSelectedVehicles((prev) => ({ ...prev, [request.id]: suggestion.recommendedVehicleId }));
        }
      }
    } catch (err) {
      console.error('Error al invocar despacho IA:', err);
    } finally {
      setLoadingAi((prev) => ({ ...prev, [request.id]: false }));
    }
  };

  useEffect(() => {
    fetchData();

    if (typeof window === 'undefined') return;

    let socketInstance: Socket | null = null;
    const token = localStorage.getItem('token');

    import('socket.io-client').then(({ io }) => {
      socketInstance = io(getRealtimeUrl(), {
        auth: { token },
      });
      setSocket(socketInstance);

      socketInstance.on('connect', () => {
        setRealtimeConnected(true);
      });

      socketInstance.on('disconnect', () => {
        setRealtimeConnected(false);
      });

      socketInstance.on('vehicles:update', (updatedVehicles) => {
        setVehicles(updatedVehicles);
      });

      socketInstance.on('trip-requests:update', (updatedRequests) => {
        setTripRequests(updatedRequests);
      });

      socketInstance.on('trip:assigned', (data) => {
        setTripRequests((prev) => prev.filter((req) => req.id !== data.tripRequestId));
      });
    });

    return () => {
      socketInstance?.disconnect();
    };
  }, []);

  const availableVehicles = vehicles.filter((v) => v.status === 'available');
  const busyVehicles = vehicles.filter((v) => v.status === 'busy');

  return (
    <AppLayout
      title="Centro de Despacho en Vivo | RadioTaxi SaaS"
      realtimeConnected={realtimeConnected}
      onRefresh={fetchData}
      loading={loading}
    >
      <div className="space-y-6">
        {/* Encabezado y Métricas Rápidas */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🚖</span> Centro de Despacho Operativo
            </h1>
            <p className="text-sm text-slate-400">
              Monitoreo cartográfico en vivo y asignación asistida por IA para RadioTaxi Bolivia.
            </p>
          </div>
        </div>

        {/* Tarjetas KPI de Estado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Solicitudes en Cola</span>
            <span className="text-3xl font-black text-white mt-1 block">{tripRequests.length}</span>
            <span className="text-[11px] text-cyan-400 mt-1 block">Pasajeros esperando</span>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-emerald-400 font-mono block uppercase">Taxis Libres</span>
            <span className="text-3xl font-black text-emerald-300 mt-1 block">{availableVehicles.length}</span>
            <span className="text-[11px] text-emerald-500/80 mt-1 block">Listos para asignar</span>
          </div>

          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-amber-400 font-mono block uppercase">En Ruta</span>
            <span className="text-3xl font-black text-amber-300 mt-1 block">{busyVehicles.length}</span>
            <span className="text-[11px] text-amber-500/80 mt-1 block">Carrera en curso</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Flota Monitoreada</span>
            <span className="text-3xl font-black text-indigo-300 mt-1 block">{vehicles.length}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Telemetría activa</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Layout en dos columnas: Mapa en Vivo (7 cols) vs Cola de Despacho (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mapa Leaflet */}
          <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span>🗺️</span> Telemetría de Flota (La Paz / El Alto)
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                {vehicles.filter((v) => v.currentLat && v.currentLng).length} GPS Transmitiendo
              </span>
            </div>

            <div className="h-[460px] w-full rounded-xl overflow-hidden border border-slate-800">
              <DispatchMapClient
                vehicles={vehicles}
                centerLat={-16.5}
                centerLng={-68.15}
                zoom={13}
              />
            </div>
          </div>

          {/* Cola de Solicitudes y Despacho con IA */}
          <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <span>⚡</span> Solicitudes Pendientes ({tripRequests.length})
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                DESPACHO INTELIGENTE
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 max-h-[460px] pr-1">
              {tripRequests.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-800 rounded-xl">
                  <span className="text-3xl mb-2">✨</span>
                  <p className="text-sm font-bold text-slate-300">No hay solicitudes pendientes</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Las carreras solicitadas por clientes o call center aparecerán aquí al instante.
                  </p>
                </div>
              ) : (
                tripRequests.map((request) => {
                  const suggestion = aiSuggestions[request.id];
                  const isAiLoading = loadingAi[request.id];
                  const selectedVehicleId = selectedVehicles[request.id] || '';

                  return (
                    <div
                      key={request.id}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3 hover:border-slate-700 transition"
                    >
                      {/* Cabecera del pedido */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-cyan-400">
                          #{request.id} • {request.passengerName || 'Pasajero'}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          PENDIENTE
                        </span>
                      </div>

                      {/* Direcciones */}
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <span className="text-emerald-400">●</span>
                          <span className="truncate">{request.originAddress || 'Origen por GPS'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <span className="text-red-400">●</span>
                          <span className="truncate">{request.destinationAddress || 'Destino a convenir'}</span>
                        </div>
                      </div>

                      {/* Tarjeta sugerencia IA */}
                      {suggestion && (
                        <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-[11px] space-y-1">
                          <div className="flex items-center justify-between font-bold text-indigo-300">
                            <span>✨ Gemini IA ({suggestion.source}):</span>
                            <span>Vehículo #{suggestion.recommendedVehicleId}</span>
                          </div>
                          <p className="text-indigo-200/80">{suggestion.reason}</p>
                        </div>
                      )}

                      {/* Selector de vehículo y asignación */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800/60">
                        <select
                          value={selectedVehicleId}
                          onChange={(e) =>
                            setSelectedVehicles((prev) => ({
                              ...prev,
                              [request.id]: parseInt(e.target.value),
                            }))
                          }
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="">Seleccionar ({availableVehicles.length} libres)</option>
                          {availableVehicles.map((v) => (
                            <option key={v.id} value={v.id}>
                              🚗 {v.plate} ({v.brand} {v.model})
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => requestAiSuggestion(request)}
                          disabled={isAiLoading || availableVehicles.length === 0}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold transition disabled:opacity-40"
                        >
                          {isAiLoading ? 'Analizando...' : '✨ IA'}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const vId = selectedVehicles[request.id];
                            if (vId) assignTrip(request.id, vId);
                          }}
                          disabled={!selectedVehicles[request.id]}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition disabled:opacity-40"
                        >
                          Asignar
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Resumen Operativo de Unidades en Ruta */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Unidades en Operación Activa
            </span>
            <span className="text-xs text-slate-400">
              {busyVehicles.length} unidades ocupadas / {availableVehicles.length} disponibles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <span className="font-mono font-bold text-white text-sm block">{vehicle.plate}</span>
                  <span className="text-[11px] text-slate-400 block">
                    {vehicle.brand} {vehicle.model}
                  </span>
                  <span
                    className={`inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                      vehicle.status === 'available'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : vehicle.status === 'busy'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                    }`}
                  >
                    {vehicle.status}
                  </span>
                </div>

                {vehicle.status === 'busy' && (
                  <button
                    onClick={() => completeTrip(vehicle.id)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition"
                  >
                    Liberar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
