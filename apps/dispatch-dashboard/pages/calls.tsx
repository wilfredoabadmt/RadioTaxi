import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../components/layout/AppLayout';
import { handleAuthExpired } from '../utils/api';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

export default function CallsPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simPhone, setSimPhone] = useState('+591 71554433');
  const [simName, setSimName] = useState('Mariana Paz');
  const [simulating, setSimulating] = useState(false);

  const fetchCalls = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/calls/history?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        handleAuthExpired();
        return;
      }

      if (!res.ok) throw new Error('Error al cargar historial de llamadas');
      const data = await res.json();
      setCalls(data.calls || []);
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con la central telefónica');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const handleSimulateCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    try {
      // Intenta llamar al microservicio de telefonía (puerto 3003) o directo a la API
      const telephonyUrl = 'http://localhost:3003/simulate/incoming-call';
      const callUuid = `call-sim-${Date.now()}`;

      try {
        await fetch(telephonyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callUuid,
            fromNumber: simPhone,
            callerId: simName,
            companyId: 1,
          }),
        });
      } catch {
        // Fallback: registrar directo en la API si el gateway de telefonía está en standby
        const token = localStorage.getItem('token');
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/calls/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            callUuid,
            fromNumber: simPhone,
            callerId: simName,
            eventType: 'RINGING',
            companyId: 1,
          }),
        });
      }

      setShowSimulateModal(false);
      fetchCalls();
    } catch (err: any) {
      alert(err.message || 'Error al simular llamada');
    } finally {
      setSimulating(false);
    }
  };

  // KPIs
  const totalCalls = calls.length;
  const convertedTrips = calls.filter((c) => c.tripId).length;
  const conversionRate = totalCalls > 0 ? Math.round((convertedTrips / totalCalls) * 100) : 0;
  const avgDuration =
    totalCalls > 0
      ? Math.round(
          calls.reduce((acc, c) => acc + (c.durationSeconds || 0), 0) /
            (calls.filter((c) => c.durationSeconds).length || 1),
        )
      : 0;

  return (
    <AppLayout title="Telefonía y Call Center | RadioTaxi SaaS" onRefresh={fetchCalls} loading={loading}>
      <div className="space-y-6">
        {/* Cabecera y Botón de Acción */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>📞</span> Central Telefónica & VoIP Asterisk
            </h1>
            <p className="text-sm text-slate-400">
              Captura automática de llamadas entrantes, identificación de cliente y despacho en 1-clic.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSimulateModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
            >
              <span>🔔</span> Simular Llamada Entrante
            </button>
          </div>
        </div>

        {/* Tarjetas KPI de Telefonía */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Total Llamadas</span>
            <span className="text-2xl font-black text-white mt-1 block">{totalCalls}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Historial registrado</span>
          </div>

          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-emerald-400 font-mono block uppercase">Viajes Despachados</span>
            <span className="text-2xl font-black text-emerald-300 mt-1 block">{convertedTrips}</span>
            <span className="text-[11px] text-emerald-500/80 mt-1 block">Tasa de conversión: {conversionRate}%</span>
          </div>

          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-cyan-400 font-mono block uppercase">Duración Promedio</span>
            <span className="text-2xl font-black text-cyan-300 mt-1 block">{avgDuration}s</span>
            <span className="text-[11px] text-cyan-500/80 mt-1 block">Tiempo de atención</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Estado PBX</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
              En Línea
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block">Asterisk ARI / MixMonitor</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Tabla de Historial de Llamadas */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase">
              <span>📋</span> Registro de Llamadas Telefónicas Recientes
            </h2>
            <button
              onClick={fetchCalls}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition"
            >
              🔄 Actualizar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Número Llamante</th>
                  <th className="py-3 px-4">Cliente / CallerID</th>
                  <th className="py-3 px-4">Duración</th>
                  <th className="py-3 px-4">Grabación Audio</th>
                  <th className="py-3 px-4">Viaje Asociado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {calls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No hay llamadas registradas en la central. Utilice el botón superior para simular una llamada.
                    </td>
                  </tr>
                ) : (
                  calls.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {new Date(c.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white font-mono text-sm tracking-wide">
                        {c.fromNumber || 'Desconocido'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-200 block">
                            {c.customer?.name || c.callerId || 'Cliente Anónimo'}
                          </span>
                          {c.customer?.email && (
                            <span className="text-[11px] text-slate-500 block">{c.customer.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {c.durationSeconds ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-cyan-300">
                            ⏱️ {c.durationSeconds} seg
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">En curso / 0s</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {c.recordingUrl ? (
                          <div className="flex items-center gap-2">
                            <audio controls className="h-7 w-44" src={c.recordingUrl}>
                              Tu navegador no soporta el reproductor de audio.
                            </audio>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Sin audio</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {c.tripId ? (
                          <Link
                            href="/trips"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold hover:bg-emerald-500/20 transition"
                          >
                            <span>✓</span> Viaje #{c.tripId}
                          </Link>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">No despachado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Simular Llamada Entrante */}
        {showSimulateModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <span>📞</span> Simular Llamada Entrante PBX
              </h3>
              <p className="text-xs text-slate-400">
                Dispara una llamada telefónica simulada hacia la central para verificar la alerta emergente y el despacho en 1-clic.
              </p>

              <form onSubmit={handleSimulateCall} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 font-mono mb-1 font-semibold">
                    NÚMERO TELEFÓNICO
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+591 71554433"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1 font-semibold">
                    NOMBRE / CALLERID INFORMATIVO
                  </label>
                  <input
                    type="text"
                    placeholder="Mariana Paz"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowSimulateModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={simulating}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 transition"
                  >
                    {simulating ? 'Llamando...' : 'Llamar a la Central'}
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
