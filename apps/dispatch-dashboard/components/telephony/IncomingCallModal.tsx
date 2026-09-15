import { useState, useEffect } from 'react';

export interface CallerProfileData {
  id?: number;
  phoneNumber?: string;
  displayName?: string;
  frequentCustomer?: boolean;
  totalTripsCount?: number;
  frequentAddresses?: string[];
  customer?: { id: number; name: string; phone: string };
}

interface IncomingCallModalProps {
  call: {
    callUuid: string;
    fromNumber: string;
    toNumber?: string;
    callerId?: string;
    companyId?: number;
    profile?: CallerProfileData;
  };
  onClose: () => void;
  onTripCreated?: (tripData: any) => void;
}

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

export default function IncomingCallModal({ call, onClose, onTripCreated }: IncomingCallModalProps) {
  const profile: CallerProfileData = call.profile || {};
  const [originAddress, setOriginAddress] = useState(
    profile.frequentAddresses && profile.frequentAddresses.length > 0 ? profile.frequentAddresses[0] : ''
  );
  const [destinationAddress, setDestinationAddress] = useState('');
  const [customerName, setCustomerName] = useState(
    profile.customer?.name || call.callerId || ''
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reproducir tono de llamada suave mediante Web Audio API
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // Tono A4
        osc.frequency.setValueAtTime(480, ctx.currentTime + 0.2); // Tono dual ring

        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch {
      // Ignorar si el navegador bloquea audio sin interacción previa
    }
  }, []);

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/calls/${call.callUuid}/trip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          originAddress,
          destinationAddress: destinationAddress || undefined,
          customerName: customerName || undefined,
          notes: notes || undefined,
          companyId: call.companyId || 1,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error al crear solicitud de viaje desde la llamada');
      }

      const result = await res.json();
      if (onTripCreated) {
        onTripCreated(result);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fallo de conexión al despachar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl w-full max-w-lg p-6 shadow-2xl shadow-emerald-500/20 space-y-6">
        {/* Cabecera con efecto de Timbre */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-2xl">
              <span className="animate-bounce">📞</span>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-emerald-400 uppercase">
                  Llamada Entrante PBX
                </span>
                {profile.frequentCustomer && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                    ⭐ Frecuente ({profile.totalTripsCount || 0} viajes)
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white font-mono tracking-tight mt-0.5">
                {call.fromNumber}
              </h2>
              {profile.displayName && (
                <p className="text-xs text-slate-400">
                  Identificado: <strong className="text-cyan-400">{profile.displayName}</strong>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Atajos de Direcciones Frecuentes */}
        {profile.frequentAddresses && profile.frequentAddresses.length > 0 && (
          <div className="space-y-1.5 bg-slate-950/50 border border-slate-800/80 p-3 rounded-2xl">
            <span className="text-[11px] font-mono text-slate-400 font-bold uppercase block">
              📍 Direcciones Habituales del Pasajero:
            </span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(profile.frequentAddresses || []).map((addr: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setOriginAddress(addr)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition font-medium border ${
                    originAddress === addr
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {addr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Formulario de Despacho en 1-Clic */}
        <form onSubmit={handleCreateTrip} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 font-mono mb-1 font-semibold">
              DIRECCIÓN DE RECOGIDA (ORIGEN) *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Av. 6 de Agosto esq. Aspiazu, Sopocachi"
              value={originAddress}
              onChange={(e) => setOriginAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-mono mb-1 font-semibold">
              DESTINO (OPCIONAL)
            </label>
            <input
              type="text"
              placeholder="Ej: Aeropuerto Internacional El Alto"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-mono mb-1 font-semibold">
                NOMBRE DEL PASAJERO
              </label>
              <input
                type="text"
                placeholder="Nombre para el chofer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-mono mb-1 font-semibold">
                NOTAS DEL OPERADOR
              </label>
              <input
                type="text"
                placeholder="Ej: Puerta verde, con equipaje"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition font-semibold"
            >
              Ignorar Llamada
            </button>

            <button
              type="submit"
              disabled={loading || !originAddress}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <span>⚡</span>
              <span>{loading ? 'Creando Despacho...' : 'Despachar en 1-Clic'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
