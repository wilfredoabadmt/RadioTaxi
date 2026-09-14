import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

export default function FleetPage() {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'drivers'>('vehicles');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);

  // Formulario nuevo vehículo
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    vehicleType: 'sedan',
  });

  // Formulario nuevo conductor
  const [newDriver, setNewDriver] = useState({
    name: '',
    email: '',
    phone: '',
    licenseNumber: '',
    password: 'password123',
  });

  const fetchData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = { Authorization: `Bearer ${token}` };

      const [vRes, dRes] = await Promise.all([
        fetch(`${baseUrl}/vehicles`, { headers }),
        fetch(`${baseUrl}/drivers`, { headers }),
      ]);

      if (!vRes.ok || !dRes.ok) {
        throw new Error('Error al cargar datos de la flota');
      }

      setVehicles(await vRes.json());
      setDrivers(await dRes.json());
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/vehicles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newVehicle),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error al crear vehículo');
      }

      setShowVehicleModal(false);
      setNewVehicle({ plate: '', brand: '', model: '', year: 2024, color: '', vehicleType: 'sedan' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/drivers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newDriver),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error al registrar conductor');
      }

      setShowDriverModal(false);
      setNewDriver({ name: '', email: '', phone: '', licenseNumber: '', password: 'password123' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const availableVehiclesCount = vehicles.filter((v) => v.status === 'available').length;
  const busyVehiclesCount = vehicles.filter((v) => v.status === 'busy').length;
  const offlineVehiclesCount = vehicles.filter((v) => v.status !== 'available' && v.status !== 'busy').length;

  return (
    <AppLayout title="Gestión de Flota | RadioTaxi SaaS" onRefresh={fetchData} loading={loading}>
      <div className="space-y-6">
        {/* Encabezado y Métricas Rápidas */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🚗</span> Gestión de Flota y Conductores
            </h1>
            <p className="text-sm text-slate-400">
              Control de unidades móviles, asignación y estado operativo en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowVehicleModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5"
            >
              <span>+</span> Nuevo Vehículo
            </button>
            <button
              onClick={() => setShowDriverModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>+</span> Nuevo Conductor
            </button>
          </div>
        </div>

        {/* Tarjetas KPI de Estado */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Total Unidades</span>
            <span className="text-2xl font-black text-white mt-1 block">{vehicles.length}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Vehículos registrados</span>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-emerald-400 font-mono block uppercase">Disponibles</span>
            <span className="text-2xl font-black text-emerald-300 mt-1 block">{availableVehiclesCount}</span>
            <span className="text-[11px] text-emerald-500/80 mt-1 block">Listos para despacho</span>
          </div>

          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-amber-400 font-mono block uppercase">En Ruta (Busy)</span>
            <span className="text-2xl font-black text-amber-300 mt-1 block">{busyVehiclesCount}</span>
            <span className="text-[11px] text-amber-500/80 mt-1 block">Viaje activo</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Conductores</span>
            <span className="text-2xl font-black text-cyan-300 mt-1 block">{drivers.length}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Plantilla activa</span>
          </div>
        </div>

        {/* Navegación por Pestañas */}
        <div className="flex border-b border-slate-800 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`pb-3 transition relative ${
              activeTab === 'vehicles' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🚗 Parque Automotor ({vehicles.length})
            {activeTab === 'vehicles' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400/50" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('drivers')}
            className={`pb-3 transition relative ${
              activeTab === 'drivers' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            👤 Conductores ({drivers.length})
            {activeTab === 'drivers' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400 rounded-full shadow-sm shadow-cyan-400/50" />
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Pestaña: Vehículos */}
        {activeTab === 'vehicles' && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Placa</th>
                    <th className="py-3 px-4">Marca y Modelo</th>
                    <th className="py-3 px-4">Año / Color</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Conductor Asignado</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Telemetría</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {vehicles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No hay vehículos registrados en la flota.
                      </td>
                    </tr>
                  ) : (
                    vehicles.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4 font-bold text-white font-mono text-sm tracking-wide">
                          {v.plate}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          {v.brand} {v.model}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {v.year} • {v.color || 'No definido'}
                        </td>
                        <td className="py-3.5 px-4 uppercase text-[10px] font-mono text-slate-400">
                          {v.vehicleType || 'sedan'}
                        </td>
                        <td className="py-3.5 px-4">
                          {v.driver?.user?.name ? (
                            <span className="text-cyan-300 font-medium">👤 {v.driver.user.name}</span>
                          ) : (
                            <span className="text-slate-500 italic">Sin asignar</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              v.status === 'available'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : v.status === 'busy'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-400">
                          {v.currentLat && v.currentLng
                            ? `${v.currentLat.toFixed(3)}, ${v.currentLng.toFixed(3)}`
                            : 'GPS Inactivo'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pestaña: Conductores */}
        {activeTab === 'drivers' && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Nombre Conductor</th>
                    <th className="py-3 px-4">Licencia</th>
                    <th className="py-3 px-4">Teléfono</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Experiencia</th>
                    <th className="py-3 px-4">Vehículo Actual</th>
                    <th className="py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {drivers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No hay conductores registrados.
                      </td>
                    </tr>
                  ) : (
                    drivers.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4 font-bold text-white">
                          {d.user?.name || `Conductor #${d.id}`}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-300 font-semibold">
                          {d.licenseNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300 font-mono">
                          {d.user?.phone || 'Sin teléfono'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {d.user?.email || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {d.experienceYears ? `${d.experienceYears} años` : 'Inicial'}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                          {d.vehicles && d.vehicles.length > 0 ? (
                            `🚗 ${d.vehicles[0].plate}`
                          ) : (
                            <span className="text-slate-500 font-normal italic">Ninguno</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              d.status === 'available'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : d.status === 'busy'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                            }`}
                          >
                            {d.status || 'available'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Registrar Nuevo Vehículo */}
        {showVehicleModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-4">Registrar Nuevo Vehículo</h2>
              <form onSubmit={handleCreateVehicle} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PLACA DEL VEHÍCULO</label>
                  <input
                    type="text"
                    required
                    placeholder="ABC-1234"
                    value={newVehicle.plate}
                    onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">MARCA</label>
                    <input
                      type="text"
                      required
                      placeholder="Toyota"
                      value={newVehicle.brand}
                      onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">MODELO</label>
                    <input
                      type="text"
                      required
                      placeholder="Corolla"
                      value={newVehicle.model}
                      onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">AÑO</label>
                    <input
                      type="number"
                      value={newVehicle.year}
                      onChange={(e) => setNewVehicle({ ...newVehicle, year: parseInt(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">COLOR</label>
                    <input
                      type="text"
                      placeholder="Blanco"
                      value={newVehicle.color}
                      onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowVehicleModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                  >
                    Guardar Vehículo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Registrar Nuevo Conductor */}
        {showDriverModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="text-lg font-bold text-white mb-4">Registrar Nuevo Conductor</h2>
              <form onSubmit={handleCreateDriver} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">NOMBRE COMPLETO</label>
                  <input
                    type="text"
                    required
                    placeholder="Juan Perez"
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono mb-1">NÚMERO DE LICENCIA</label>
                  <input
                    type="text"
                    required
                    placeholder="LIC-998877"
                    value={newDriver.licenseNumber}
                    onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">TELÉFONO</label>
                    <input
                      type="text"
                      placeholder="+591 70000000"
                      value={newDriver.phone}
                      onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">EMAIL DE ACCESO</label>
                    <input
                      type="email"
                      required
                      placeholder="conductor@demo.bo"
                      value={newDriver.email}
                      onChange={(e) => setNewDriver({ ...newDriver, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowDriverModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                  >
                    Registrar Conductor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
