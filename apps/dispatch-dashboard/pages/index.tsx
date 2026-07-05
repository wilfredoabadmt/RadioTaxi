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
        // Actualizar la lista de solicitudes de viaje
        setTripRequests(prev => prev.filter(req => req.id !== data.tripRequestId));
      });
    });

    return () => {
      socketInstance?.disconnect();
    };
  }, []);

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f8fafc',
      color: '#0f172a',
      padding: '32px'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
            RadioTaxi - Panel de Despacho
          </h1>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: loading ? '#fef3c7' : '#d1fae5',
              color: loading ? '#92400e' : '#065f46',
              fontSize: '0.875rem'
            }}>
              API: {loading ? 'Cargando...' : error ? 'Error' : 'Conectado'}
            </div>
            <div style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: realtimeConnected ? '#d1fae5' : '#fee2e2',
              color: realtimeConnected ? '#065f46' : '#991b1b',
              fontSize: '0.875rem'
            }}>
              Tiempo Real: {realtimeConnected ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
        </div>
        <header style={{ marginBottom: 32 }}>
          <p style={{ margin: 0, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5 }}>RadioTaxi Dashboard</p>
          <h1 style={{ margin: '8px 0 0', fontSize: 42 }}>Operadora en tiempo real</h1>
          <p style={{ margin: '12px 0 0', color: '#475569', fontSize: 18 }}>
            Monitorea solicitudes, vehículos disponibles y reportes corporativos desde un solo panel.
          </p>
        </header>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 280 }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 18, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}>
              <p style={{ margin: 0, color: '#64748b' }}>Estado del sistema</p>
              <h2 style={{ margin: '12px 0 0', fontSize: 28 }}>Resumen rápido</h2>
              <div style={{ marginTop: 20, display: 'grid', gap: 12 }}>
                <div style={{ background: '#f1f5f9', borderRadius: 14, padding: 16 }}>
                  <strong>{tripRequests.length}</strong>
                  <p style={{ margin: '8px 0 0', color: '#475569' }}>Solicitudes de viaje</p>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 14, padding: 16 }}>
                  <strong>{vehicles.length}</strong>
                  <p style={{ margin: '8px 0 0', color: '#475569' }}>Vehículos registrados</p>
                </div>
                <div style={{ background: '#f1f5f9', borderRadius: 14, padding: 16 }}>
                  <strong>{reports.length}</strong>
                  <p style={{ margin: '8px 0 0', color: '#475569' }}>Reportes corporativos</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ flex: '2 1 640px', minWidth: 320 }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 18, boxShadow: '0 14px 32px rgba(15,23,42,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, color: '#64748b' }}>Panel operativo</p>
                  <h2 style={{ margin: '8px 0 0', fontSize: 28 }}>Acciones rápidas</h2>
                </div>
                <button
                  onClick={fetchData}
                  style={{
                    background: '#312e81',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 18px',
                    cursor: 'pointer'
                  }}
                >
                  Actualizar datos
                </button>
              </div>
              <p style={{ marginTop: 16, color: '#475569' }}>
                {loading ? 'Cargando datos...' : 'Utiliza este panel para verificar el estado del despacho y los reportes de la flota.'}
              </p>
              {error ? (
                <div style={{ marginTop: 16, padding: 16, background: '#fee2e2', color: '#991b1b', borderRadius: 12 }}>
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <SectionCard title="Mapa de despacho" description="Vista preliminar de la ubicación en tiempo real.">
          <MapPlaceholder tripRequests={tripRequests} vehicles={vehicles} />
        </SectionCard>

        <SectionCard title="Solicitudes de viaje" description="Lista de viajes pendientes y programados."> 
          {tripRequests.length === 0 ? (
            <p>No hay solicitudes disponibles.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {tripRequests.slice(0, 4).map((request) => (
                <div key={request.id} style={{ padding: 16, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{request.originAddress} → {request.destinationAddress}</p>
                  <p style={{ margin: '8px 0 0', color: '#475569' }}>Estado: {request.status}</p>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: '#fff'
                      }}
                      id={`vehicle-select-${request.id}`}
                    >
                      <option value="">Seleccionar vehículo</option>
                      {vehicles.filter(v => v.status === 'available').map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} - {vehicle.status}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById(`vehicle-select-${request.id}`) as HTMLSelectElement;
                        const vehicleId = parseInt(select.value);
                        if (vehicleId) {
                          assignTrip(request.id, vehicleId);
                        }
                      }}
                      style={{
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        cursor: 'pointer'
                      }}
                    >
                      Asignar viaje
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Vehículos activos" description="Monitorea el inventario y el estado de la flota."> 
          {vehicles.length === 0 ? (
            <p>No hay vehículos registrados.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {vehicles.slice(0, 4).map((vehicle) => (
                <div key={vehicle.id} style={{ padding: 16, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{vehicle.plate || 'Sin placa'}</p>
                  <p style={{ margin: '8px 0 0', color: '#475569' }}>Estado: {vehicle.status}</p>
                  {vehicle.status === 'busy' && (
                    <button
                      onClick={() => completeTrip(vehicle.id)}
                      style={{
                        marginTop: 8,
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        cursor: 'pointer'
                      }}
                    >
                      Completar viaje
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Reportes corporativos" description="Genera y descarga reportes B2B en Excel o CSV."> 
          {reports.length === 0 ? (
            <p>No hay reportes generados.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {reports.slice(0, 4).map((report) => (
                <div key={report.id} style={{ padding: 16, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'grid', gap: 8 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{report.reportType}</p>
                    <p style={{ margin: '8px 0 0', color: '#475569' }}>Generado: {new Date(report.generatedAt).toLocaleString()}</p>
                  </div>
                  <a
                    href={`${apiBaseUrl}/reports/corporate/download/${report.id}`}
                    style={{
                      display: 'inline-block',
                      marginTop: 8,
                      background: '#2563eb',
                      color: '#fff',
                      padding: '10px 14px',
                      borderRadius: 10,
                      textDecoration: 'none'
                    }}
                  >
                    Descargar reporte
                  </a>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
};

export default Home;
