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
      if (!tripsRes.ok || !vehiclesRes.ok || !reportsRes.ok) throw new Error('Error fetching data from backend');
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
    if (socket) socket.emit('trip:assign', { tripRequestId, vehicleId });
  };

  const completeTrip = (vehicleId: number) => {
    if (socket) socket.emit('trip:complete', { vehicleId });
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let socketInstance: Socket | null = null;
    import('socket.io-client').then(({ io }) => {
      socketInstance = io(realtimeUrl);
      setSocket(socketInstance);
      socketInstance.on('connect', () => setRealtimeConnected(true));
      socketInstance.on('disconnect', () => setRealtimeConnected(false));
    });
    return () => { socketInstance?.disconnect(); };
  }, []);

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>RadioTaxi - Panel de Despacho</h1>
        {/* Simplified for brevity while keeping core logic */}
        <SectionCard title="Mapa de despacho" description="Vista preliminar de la ubicación en tiempo real.">
          <MapPlaceholder tripRequests={tripRequests} vehicles={vehicles} />
        </SectionCard>
      </div>
    </main>
  );
};

export default Home;
