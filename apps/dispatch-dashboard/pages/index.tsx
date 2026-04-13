import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import SectionCard from '../components/SectionCard';
import MapPlaceholder from '../components/MapPlaceholder';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:3002';

const Home = () => {
  const [tripRequests, setTripRequests] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [tripsRes, vehiclesRes, reportsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/trip-requests`),
        fetch(`${apiBaseUrl}/vehicles`),
        fetch(`${apiBaseUrl}/reports/corporate`)
      ]);

      if (!tripsRes.ok || !vehiclesRes.ok || !reportsRes.ok) {
        throw new Error('Error fetching data from backend');
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
    if (socket) {
      socket.emit('trip:assign', { tripRequestId, vehicleId });
    }
  };

  const completeTrip = (vehicleId: number) => {
    if (socket) {
      socket.emit('trip:complete', { vehicleId });
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let socketInstance: Socket | null = null;

    import('socket.io-client').then(({ io }) => {
      socketInstance = io(realtimeUrl);
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
        console.log('Vehículos actualizados:', updatedVehicles);
        setVehicles(updatedVehicles);
      });

      socketInstance.on('trip-requests:update', (updatedRequests) => {
        console.log('Solicitudes actualizadas:', updatedRequests);
        setTripRequests(updatedRequests);
      });

      socketInstance.on('trip:assigned', (data) => {
        console.log('Viaje asignado:', data);
        setTripRequests(prev => prev.filter(req => req.id !== data.tripRequestId));
      });
    });

    return () => {
      socketInstance?.disconnect();
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 tracking-tight">
            RadioTaxi - Panel de Despacho
          </h1>
          <div className="flex gap-4 items-center">
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${loading ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              API: {loading ? 'Cargando...' : error ? 'Error' : 'Conectado'}
            </div>
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${realtimeConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              Tiempo Real: {realtimeConnected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SectionCard title="Mapa de despacho" className="lg:col-span-2 h-[500px]">
            <MapPlaceholder />
          </SectionCard>

          <div className="space-y-8">
            <SectionCard title="Solicitudes Pendientes">
              {tripRequests.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No hay solicitudes disponibles.</p>
              ) : (
                <div className="space-y-4">
                  {tripRequests.map((request) => (
                    <div key={request.id} className="p-4 rounded-xl bg-white border border-slate-200">
                      <p className="font-semibold text-sm">{request.originAddress} → {request.destinationAddress}</p>
                      <div className="mt-4 flex gap-2">
                        <select className="flex-1 text-sm rounded-md border-slate-300 shadow-sm" id={`vehicle-select-${request.id}`}>
                          <option value="">Seleccionar vehículo</option>
                          {vehicles.filter(v => v.status === 'available').map(vehicle => (
                            <option key={vehicle.id} value={vehicle.id}>{vehicle.plate}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => {
                            const select = document.getElementById(`vehicle-select-${request.id}`) as HTMLSelectElement;
                            if (select.value) assignTrip(request.id, parseInt(select.value));
                          }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors"
                        >
                          Asignar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;
