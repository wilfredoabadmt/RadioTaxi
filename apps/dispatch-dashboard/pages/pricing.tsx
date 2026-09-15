import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

interface PricingRule {
  id: number;
  companyId: number;
  name: string;
  type: string;
  baseFare: number;
  kmRate: number;
  minuteRate: number;
  minFare: number;
  tollSurcharge: number;
  geofenceSurcharge: number;
  peakMultiplier: number;
  active: boolean;
}

interface Geofence {
  id: number;
  companyId: number;
  name: string;
  type: string;
  surcharge: number;
  areaGeoJson?: string | null;
}

const GEOFENCE_PRESETS = [
  {
    name: 'Aeropuerto Internacional El Alto',
    type: 'AIRPORT',
    surcharge: 15,
    areaGeoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [-68.195, -16.515],
        [-68.165, -16.515],
        [-68.165, -16.500],
        [-68.195, -16.500],
        [-68.195, -16.515]
      ]]
    })
  },
  {
    name: 'Zona Sur (Calacoto / La Florida / Achumani)',
    type: 'ZONE',
    surcharge: 8,
    areaGeoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [-68.105, -16.550],
        [-68.070, -16.550],
        [-68.070, -16.530],
        [-68.105, -16.530],
        [-68.105, -16.550]
      ]]
    })
  },
  {
    name: 'Casco Urbano Central / San Pedro',
    type: 'DOWNTOWN',
    surcharge: 4,
    areaGeoJson: JSON.stringify({
      type: 'Polygon',
      coordinates: [[
        [-68.140, -16.505],
        [-68.125, -16.505],
        [-68.125, -16.495],
        [-68.140, -16.495],
        [-68.140, -16.505]
      ]]
    })
  }
];

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Regla seleccionada para el simulador
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);

  // Simulador de cotización interactivo
  const [simKm, setSimKm] = useState<number>(5.5);
  const [simMinutes, setSimMinutes] = useState<number>(18);
  const [simPeak, setSimPeak] = useState<boolean>(false);
  const [simToll, setSimToll] = useState<number>(0);
  const [simGeofence, setSimGeofence] = useState<number>(0);

  // Estados de los Modales
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    name: '',
    type: 'STANDARD',
    baseFare: 5.0,
    kmRate: 3.0,
    minuteRate: 0.5,
    minFare: 10.0,
    tollSurcharge: 0,
    geofenceSurcharge: 0,
    peakMultiplier: 1.5,
    active: true,
  });

  const [showGeofenceModal, setShowGeofenceModal] = useState(false);
  const [geofenceForm, setGeofenceForm] = useState({
    name: '',
    type: 'ZONE',
    surcharge: 10,
    areaGeoJson: '',
  });

  const [submitting, setSubmitting] = useState(false);

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

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData);
        if (rulesData.length > 0 && !selectedRuleId) {
          setSelectedRuleId(rulesData[0].id);
        }
      }
      if (geoRes.ok) {
        setGeofences(await geoRes.json());
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cargar reglas de tarificación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingData();
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Guardar Regla (Crear o Actualizar)
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const url = editingRule
        ? `${baseUrl}/pricing/rules/${editingRule.id}`
        : `${baseUrl}/pricing/rules`;
      const method = editingRule ? 'PATCH' : 'POST';

      const body = {
        ...ruleForm,
        companyId: 1, // Empresa principal operadora
        baseFare: Number(ruleForm.baseFare),
        kmRate: Number(ruleForm.kmRate),
        minuteRate: Number(ruleForm.minuteRate),
        minFare: Number(ruleForm.minFare),
        tollSurcharge: Number(ruleForm.tollSurcharge),
        geofenceSurcharge: Number(ruleForm.geofenceSurcharge),
        peakMultiplier: Number(ruleForm.peakMultiplier),
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al guardar regla de tarifa');
      }

      showNotification(editingRule ? 'Regla actualizada exitosamente' : 'Nueva regla creada exitosamente');
      setShowRuleModal(false);
      setEditingRule(null);
      await fetchPricingData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar o Desactivar Regla
  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('¿Estás seguro de eliminar o desactivar esta regla de tarificación?')) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/pricing/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('No se pudo eliminar la regla de tarificación');

      showNotification('Regla eliminada o desactivada correctamente');
      await fetchPricingData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Guardar Geocerca
  const handleSaveGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setSubmitting(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/pricing/geofences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...geofenceForm,
          companyId: 1,
          surcharge: Number(geofenceForm.surcharge),
          areaGeoJson: geofenceForm.areaGeoJson || JSON.stringify({ type: 'Polygon', coordinates: [] }),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al guardar geocerca');
      }

      showNotification('Geocerca perimetral registrada con éxito');
      setShowGeofenceModal(false);
      setGeofenceForm({ name: '', type: 'ZONE', surcharge: 10, areaGeoJson: '' });
      await fetchPricingData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Eliminar Geocerca
  const handleDeleteGeofence = async (geoId: number) => {
    if (!confirm('¿Deseas eliminar permanentemente esta geocerca?')) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/pricing/geofences/${geoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('No se pudo eliminar la geocerca');

      showNotification('Geocerca eliminada correctamente');
      await fetchPricingData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Abrir Modal de Edición de Regla
  const openEditRuleModal = (rule: PricingRule) => {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      type: rule.type || 'STANDARD',
      baseFare: rule.baseFare,
      kmRate: rule.kmRate,
      minuteRate: rule.minuteRate,
      minFare: rule.minFare,
      tollSurcharge: rule.tollSurcharge,
      geofenceSurcharge: rule.geofenceSurcharge,
      peakMultiplier: rule.peakMultiplier,
      active: rule.active,
    });
    setShowRuleModal(true);
  };

  // Regla activa para el cálculo del simulador
  const activeRule = rules.find((r) => r.id === selectedRuleId) || rules[0] || {
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
        {/* Encabezado y Acciones Principales */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>💳</span> Motor de Tarificación & Geocercas
            </h1>
            <p className="text-sm text-slate-400">
              Administra las tarifas oficiales en Bolivianos (BOB), zonas perimetrales y parámetros de hora pico.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingRule(null);
                setRuleForm({
                  name: '',
                  type: 'STANDARD',
                  baseFare: 5.0,
                  kmRate: 3.0,
                  minuteRate: 0.5,
                  minFare: 10.0,
                  tollSurcharge: 0,
                  geofenceSurcharge: 0,
                  peakMultiplier: 1.5,
                  active: true,
                });
                setShowRuleModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <span>➕</span> Nueva Regla
            </button>

            <button
              onClick={() => {
                setGeofenceForm({
                  name: '',
                  type: 'ZONE',
                  surcharge: 10,
                  areaGeoJson: '',
                });
                setShowGeofenceModal(true);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
            >
              <span>📍</span> Nueva Geocerca
            </button>
          </div>
        </div>

        {/* Notificaciones */}
        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <span>✅</span> {successMsg}
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Layout en dos columnas: Reglas activas vs Simulador */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Reglas de Tarificación y Geocercas (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Lista de Reglas de Tarificación */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>⚙️</span> Catálogo de Reglas Tarifarias
                  </h2>
                  <span className="text-xs text-slate-400">Selecciona una regla para cargarla en el simulador</span>
                </div>
                <span className="text-xs font-mono text-cyan-400">{rules.length} Reglas Disponibles</span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {rules.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 text-center text-slate-500 text-xs">
                    No hay reglas de tarificación creadas. Crea una con el botón superior.
                  </div>
                ) : (
                  rules.map((rule) => {
                    const isSelected = selectedRuleId === rule.id;
                    return (
                      <div
                        key={rule.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-slate-800/80 border-cyan-500/60 shadow-lg shadow-cyan-500/5'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{rule.name}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-bold">
                                {rule.type}
                              </span>
                              {rule.active ? (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  ACTIVA
                                </span>
                              ) : (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                  INACTIVA
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-300 font-mono">
                              <span>Base: <b className="text-white">Bs {Number(rule.baseFare).toFixed(2)}</b></span>
                              <span>Km: <b className="text-cyan-300">Bs {Number(rule.kmRate).toFixed(2)}</b></span>
                              <span>Min: <b className="text-indigo-300">Bs {Number(rule.minuteRate).toFixed(2)}</b></span>
                              <span>Mínima: <b className="text-amber-300">Bs {Number(rule.minFare).toFixed(2)}</b></span>
                              <span>Pico: <b className="text-purple-300">x{Number(rule.peakMultiplier).toFixed(2)}</b></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelectedRuleId(rule.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                                isSelected
                                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                              }`}
                              title="Probar en el simulador"
                            >
                              {isSelected ? 'Simulando' : 'Probar'}
                            </button>
                            <button
                              onClick={() => openEditRuleModal(rule)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs"
                              title="Editar regla"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-transparent hover:border-red-500/30 transition-all text-xs"
                              title="Eliminar / Desactivar regla"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
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
                    No se encontraron geocercas configuradas. Agrega una con el botón superior.
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
                            {geo.type || 'ZONE'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 block mt-0.5 font-mono text-[11px]">
                          Recargo automático al pasar por origen/destino
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-sm font-mono font-black text-cyan-400 block">
                            +Bs {Number(geo.surcharge || 0).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">Recargo Fijo</span>
                        </div>
                        <button
                          onClick={() => handleDeleteGeofence(geo.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-all text-xs"
                          title="Eliminar Geocerca"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Simulador Interactivo de Cotización (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950 border border-cyan-500/30 rounded-2xl p-6 shadow-xl shadow-cyan-500/5 backdrop-blur-xl space-y-6 sticky top-24">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                    Simulador en Vivo
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    Regla: {activeRule.name || 'Estándar'}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white tracking-tight mt-1">
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
                  <div>
                    <span className="text-slate-300 font-medium block">Multiplicador Hora Pico</span>
                    <span className="text-[10px] text-slate-500 font-mono">Factor x{Number(activeRule.peakMultiplier || 1.5).toFixed(2)}</span>
                  </div>
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

      {/* Modal Crear / Editar Regla de Tarifa */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>⚙️</span> {editingRule ? 'Editar Regla de Tarifa' : 'Nueva Regla de Tarifa'}
              </h3>
              <button
                onClick={() => setShowRuleModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 font-mono mb-1">NOMBRE DESCRIPTIVO</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Tarifa Nocturna La Paz"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">TIPO DE REGLA</label>
                  <select
                    value={ruleForm.type}
                    onChange={(e) => setRuleForm({ ...ruleForm, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="STANDARD">STANDARD (Diurna)</option>
                    <option value="NIGHT">NIGHT (Nocturna)</option>
                    <option value="AIRPORT">AIRPORT (Aeropuerto)</option>
                    <option value="PEAK">PEAK (Alta Demanda)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">TARIFA BASE (BS)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={ruleForm.baseFare}
                    onChange={(e) => setRuleForm({ ...ruleForm, baseFare: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">PRECIO POR KM (BS)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={ruleForm.kmRate}
                    onChange={(e) => setRuleForm({ ...ruleForm, kmRate: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">PRECIO POR MINUTO (BS)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    required
                    value={ruleForm.minuteRate}
                    onChange={(e) => setRuleForm({ ...ruleForm, minuteRate: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">TARIFA MÍNIMA (BS)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={ruleForm.minFare}
                    onChange={(e) => setRuleForm({ ...ruleForm, minFare: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">FACTOR HORA PICO</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="3.0"
                    required
                    value={ruleForm.peakMultiplier}
                    onChange={(e) => setRuleForm({ ...ruleForm, peakMultiplier: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeRuleCheck"
                  checked={ruleForm.active}
                  onChange={(e) => setRuleForm({ ...ruleForm, active: e.target.checked })}
                  className="rounded accent-cyan-500"
                />
                <label htmlFor="activeRuleCheck" className="text-slate-300 font-medium">
                  Regla activa para cotizaciones y viajes
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : editingRule ? 'Actualizar Regla' : 'Crear Regla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nueva Geocerca */}
      {showGeofenceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📍</span> Registrar Nueva Geocerca
              </h3>
              <button
                onClick={() => setShowGeofenceModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Presets Rápidos */}
            <div>
              <span className="text-xs text-slate-400 font-mono block mb-2">ZONAS PRECONFIGURADAS (BOLIVIA):</span>
              <div className="grid grid-cols-1 gap-2">
                {GEOFENCE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setGeofenceForm({
                        name: preset.name,
                        type: preset.type,
                        surcharge: preset.surcharge,
                        areaGeoJson: preset.areaGeoJson,
                      });
                    }}
                    className="text-left p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/40 transition-all flex items-center justify-between text-xs"
                  >
                    <span className="font-bold text-slate-200">{preset.name}</span>
                    <span className="text-cyan-400 font-mono font-bold">+Bs {preset.surcharge}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveGeofence} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">NOMBRE DE LA ZONA</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Aeropuerto El Alto"
                  value={geofenceForm.name}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">TIPO DE GEOCERCA</label>
                  <select
                    value={geofenceForm.type}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ZONE">ZONE (Zona Urbana)</option>
                    <option value="AIRPORT">AIRPORT (Aeropuerto)</option>
                    <option value="DOWNTOWN">DOWNTOWN (Centro)</option>
                    <option value="RESTRICTED">RESTRICTED (Restringida)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">RECARGO FIJO (BS)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={geofenceForm.surcharge}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, surcharge: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">POLÍGONO GEOJSON (OPCIONAL)</label>
                <textarea
                  rows={3}
                  placeholder='{"type":"Polygon","coordinates":[[[-68.19,-16.51],...]]}'
                  value={geofenceForm.areaGeoJson}
                  onChange={(e) => setGeofenceForm({ ...geofenceForm, areaGeoJson: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-[10px] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGeofenceModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Registrar Geocerca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
