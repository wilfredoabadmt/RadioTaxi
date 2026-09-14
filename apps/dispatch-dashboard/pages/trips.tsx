import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/trips`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Error al consultar el historial de viajes');
      }

      setTrips(await res.json());
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'IN_PROGRESS':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 animate-pulse';
      case 'ARRIVED':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'ASSIGNED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const filteredTrips = trips.filter((t) => {
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchesSearch =
      searchTerm === '' ||
      t.id.toString().includes(searchTerm) ||
      t.driver?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.vehicle?.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.passenger?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.originAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destinationAddress?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const totalCompleted = trips.filter((t) => t.status === 'COMPLETED').length;
  const totalInProgress = trips.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'ARRIVED').length;
  const totalCancelled = trips.filter((t) => t.status === 'CANCELLED').length;
  const totalRevenue = trips
    .filter((t) => t.status === 'COMPLETED' && t.finalFare)
    .reduce((acc, t) => acc + Number(t.finalFare), 0);

  return (
    <AppLayout title="Historial de Viajes | RadioTaxi SaaS" onRefresh={fetchTrips} loading={loading}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>📑</span> Historial y Auditoría de Viajes
            </h1>
            <p className="text-sm text-slate-400">
              Trazabilidad completa de la máquina de estados del despacho y liquidación de tarifas.
            </p>
          </div>
        </div>

        {/* Tarjetas KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Total Viajes</span>
            <span className="text-2xl font-black text-white mt-1 block">{trips.length}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Registrados en el sistema</span>
          </div>

          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-cyan-400 font-mono block uppercase">En Curso</span>
            <span className="text-2xl font-black text-cyan-300 mt-1 block">{totalInProgress}</span>
            <span className="text-[11px] text-cyan-500/80 mt-1 block">Asignados / En ruta</span>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-emerald-400 font-mono block uppercase">Completados</span>
            <span className="text-2xl font-black text-emerald-300 mt-1 block">{totalCompleted}</span>
            <span className="text-[11px] text-emerald-500/80 mt-1 block">Finalizados con éxito</span>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-purple-400 font-mono block uppercase">Facturación Acumulada</span>
            <span className="text-2xl font-black text-purple-300 mt-1 block">
              Bs {totalRevenue.toFixed(2)}
            </span>
            <span className="text-[11px] text-purple-400/80 mt-1 block">Moneda Boliviana (BOB)</span>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl">
          {/* Botones de estado */}
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            {['ALL', 'IN_PROGRESS', 'ARRIVED', 'ASSIGNED', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl border transition ${
                  filterStatus === st
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-sm shadow-cyan-500/10'
                    : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'TODOS' : st}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Buscar por placa, pasajero, dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Tabla de Viajes */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Vehículo & Conductor</th>
                  <th className="py-3.5 px-4">Pasajero</th>
                  <th className="py-3.5 px-4">Ruta (Origen → Destino)</th>
                  <th className="py-3.5 px-4 text-right">Distancia</th>
                  <th className="py-3.5 px-4 text-right">Tarifa (BOB)</th>
                  <th className="py-3.5 px-4 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                      No se encontraron viajes con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => (
                    <tr key={trip.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        #{trip.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadge(
                            trip.status
                          )}`}
                        >
                          {trip.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white font-mono flex items-center gap-1.5">
                          <span>🚗</span> {trip.vehicle?.plate || 'Sin Placa'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {trip.driver?.user?.name || 'Conductor no asignado'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">
                          {trip.passenger?.name || trip.tripRequest?.passengerName || 'Pasajero General'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {trip.passenger?.phone || trip.tripRequest?.passengerPhone || 'Sin teléfono'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <div className="text-slate-200 font-medium truncate flex items-center gap-1">
                          <span className="text-emerald-400">●</span> {trip.originAddress || 'Origen GPS'}
                        </div>
                        <div className="text-slate-400 text-[11px] truncate flex items-center gap-1">
                          <span className="text-red-400">●</span> {trip.destinationAddress || 'Destino por determinar'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {trip.distanceKm ? `${Number(trip.distanceKm).toFixed(2)} km` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-cyan-300 text-sm">
                        {trip.finalFare ? `Bs ${Number(trip.finalFare).toFixed(2)}` : trip.estimatedFare ? `~Bs ${Number(trip.estimatedFare).toFixed(2)}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500">
                        {new Date(trip.createdAt).toLocaleString('es-BO', {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
