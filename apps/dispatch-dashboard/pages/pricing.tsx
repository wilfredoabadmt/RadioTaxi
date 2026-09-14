import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

export default function PricingPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [geofences, setGeofences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulador de cotización interactivo
  const [simKm, setSimKm] = useState<number>(5.5);
  const [simMinutes, setSimMinutes] = useState<number>(18);
  const [simPeak, setSimPeak] = useState<boolean>(false);
  const [simToll, setSimToll] = useState<number>(0);
  const [simGeofence, setSimGeofence] = useState<number>(0);

  const fetchPricingData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = { Authorization: `Bearer ${token}` };

      const [rulesRes, geoRes] = await Promise.all([
        fetch(`${baseUrl}/pricing/rules`, { headers }),
        fetch(`${baseUrl}/pricing/geofences`, { headers }),
      ]);

      if (rulesRes.ok) setRules(await rulesRes.json());
      if (geoRes.ok) setGeofences(await geoRes.json());
    } catch (err: any) {
      setError(err?.message || 'Error al cargar reglas de tarificación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingData();
  }, []);

  // Parámetros de cálculo tomados de la primera regla o valores estándar de Bolivia
  const activeRule = rules[0] || {
    baseFare: 5.0,
    kmRate: 3.0,
    minuteRate: 0.5,
    minFare: 10.0,
    peakMultiplier: 1.5,
  };

  // Cálculo en vivo del simulador
  const baseCost = Number(activeRule.baseFare || 5);
  const distanceCost = simKm * Number(activeRule.kmRate || 3);
  const timeCost = simMinutes * Number(activeRule.minuteRate || 0.5);
  const subtotal = (baseCost + distanceCost + timeCost) * (simPeak ? Number(activeRule.peakMultiplier || 1.5) : 1);
  const surchargeTotal = Number(simToll) + Number(simGeofence);
  const finalCalculatedFare = Math.max(Number(activeRule.minFare || 10), subtotal + surchargeTotal);

  return (
    <AppLayout title="Tarifas y Geocercas | RadioTaxi SaaS" onRefresh={fetchPricingData} loading={loading}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>💳</span> Motor de Tarificación & Geocercas
          </h1>
          <p className="text-sm text-slate-400">
            Reglas de tarificación dinámicas para Bolivia (BOB) con cálculo determinista por distancia, tiempo y recargos.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Layout en dos columnas: Reglas activas vs Simulador */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Parámetros y Geocercas (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Tarjeta de Parámetros Base */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>⚙️</span> Tarifa Urbana Estándar
                  </h2>
                  <span className="text-xs text-slate-400">Moneda legal: Bolivianos (Bs / BOB)</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ACTIVA
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono block">TARIFA BASE</span>
                  <span className="text-xl font-black text-white mt-1 block">Bs {Number(activeRule.baseFare).toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block">Al abordar el taxi</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono block">PRECIO POR KM</span>
                  <span className="text-xl font-black text-cyan-300 mt-1 block">Bs {Number(activeRule.kmRate).toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block">Distancia recorrida</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono block">PRECIO POR MIN</span>
                  <span className="text-xl font-black text-indigo-300 mt-1 block">Bs {Number(activeRule.minuteRate).toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block">Tiempo en congestión</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono block">TARIFA MÍNIMA</span>
                  <span className="text-xl font-black text-amber-300 mt-1 block">Bs {Number(activeRule.minFare).toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block">Piso mínimo del viaje</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono block">HORA PICO</span>
                  <span className="text-xl font-black text-purple-300 mt-1 block">x{Number(activeRule.peakMultiplier).toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 block">Multiplicador dinámico</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-mono block">ZONA URBANA</span>
                  <span className="text-sm font-bold text-slate-200 mt-1 block">Área Metropolitana</span>
                  <span className="text-[10px] text-slate-500 block">La Paz / El Alto</span>
                </div>
              </div>
            </div>

            {/* Geocercas Especiales */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>📍</span> Geocercas y Zonas con Recargo
                  </h2>
                  <span className="text-xs text-slate-400">Polígonos espaciales validados con Ray-Casting</span>
                </div>
                <span className="text-xs font-mono text-cyan-400">{geofences.length} Zonas Registradas</span>
              </div>

              <div className="space-y-3">
                {geofences.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-500 text-xs">
                    No se encontraron geocercas configuradas.
                  </div>
                ) : (
                  geofences.map((geo) => (
                    <div
                      key={geo.id}
                      className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{geo.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            {geo.type || 'POLYGON'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          Recargo adicional por zona de difícil acceso o alta demanda
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-black text-cyan-400 block">
                          +Bs {Number(geo.surcharge || 0).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Recargo Fijo</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Simulador Interactivo de Cotización (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-cyan-500/30 rounded-2xl p-6 shadow-xl shadow-cyan-500/5 backdrop-blur-xl space-y-6">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                  Simulador en Vivo
                </span>
                <h2 className="text-lg font-black text-white tracking-tight">
                  Cotizador de Carreras
                </h2>
                <p className="text-xs text-slate-400">
                  Prueba la fórmula del motor de tarificación en tiempo real.
                </p>
              </div>

              {/* Controles del Simulador */}
              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-slate-300 font-mono mb-1.5">
                    <span>Distancia Estimada:</span>
                    <span className="text-cyan-300 font-bold">{simKm.toFixed(1)} km</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="35"
                    step="0.5"
                    value={simKm}
                    onChange={(e) => setSimKm(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300 font-mono mb-1.5">
                    <span>Duración Estimada:</span>
                    <span className="text-cyan-300 font-bold">{simMinutes} min</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="90"
                    step="1"
                    value={simMinutes}
                    onChange={(e) => setSimMinutes(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <span className="text-slate-300 font-medium">¿Aplicar Multiplicador Hora Pico?</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simPeak}
                      onChange={(e) => setSimPeak(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-slate-400 font-mono mb-1 text-[11px]">PEAJES (BS)</label>
                    <input
                      type="number"
                      min="0"
                      value={simToll}
                      onChange={(e) => setSimToll(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 font-mono mb-1 text-[11px]">GEOCERCA (BS)</label>
                    <input
                      type="number"
                      min="0"
                      value={simGeofence}
                      onChange={(e) => setSimGeofence(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Desglose Matemático */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Tarifa Base:</span>
                  <span>Bs {baseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Por Distancia ({simKm} km x {activeRule.kmRate}):</span>
                  <span>Bs {distanceCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Por Tiempo ({simMinutes} min x {activeRule.minuteRate}):</span>
                  <span>Bs {timeCost.toFixed(2)}</span>
                </div>
                {simPeak && (
                  <div className="flex justify-between text-purple-400 font-bold">
                    <span>Recargo Hora Pico (x{activeRule.peakMultiplier}):</span>
                    <span>+{((activeRule.peakMultiplier - 1) * (baseCost + distanceCost + timeCost)).toFixed(2)} Bs</span>
                  </div>
                )}
                {surchargeTotal > 0 && (
                  <div className="flex justify-between text-cyan-400">
                    <span>Recargos Adicionales:</span>
                    <span>+Bs {surchargeTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-black text-white">
                  <span className="uppercase text-slate-300">Total Cotizado:</span>
                  <span className="text-2xl text-cyan-300 font-mono">
                    Bs {finalCalculatedFare.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
