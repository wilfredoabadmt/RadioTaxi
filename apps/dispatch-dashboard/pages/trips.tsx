import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

interface TripReceipt {
  receiptNumber: string;
  authorizationCode: string;
  issuedAt: string;
  status: string;
  paymentMethod: string;
  currency: string;
  company: {
    name: string;
    nit: string;
    address: string;
  };
  passenger: {
    name: string;
    phone: string;
    email: string;
  };
  driver: {
    name: string;
    license: string;
  };
  vehicle: {
    plate: string;
    brand: string;
    model: string;
    color: string;
  };
  route: {
    origin: string;
    destination: string;
    distanceKm: number;
    durationMinutes: number;
  };
  fareBreakdown: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    totalFare: number;
  };
  legalNotice: string;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados de Modales
  const [selectedReceipt, setSelectedReceipt] = useState<TripReceipt | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const [paymentTrip, setPaymentTrip] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'qr_bolivia',
    amount: 25.0,
    transactionReference: '',
    notes: '',
  });
  const [qrIntentData, setQrIntentData] = useState<any | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Estados para Facturación Fiscal Boliviana SIN (Fase 7.7)
  const [selectedFiscalInvoice, setSelectedFiscalInvoice] = useState<any | null>(null);
  const [fiscalTrip, setFiscalTrip] = useState<any | null>(null);
  const [fiscalForm, setFiscalForm] = useState({
    clientNit: '',
    clientBusinessName: '',
    clientEmail: '',
  });
  const [issuingInvoice, setIssuingInvoice] = useState(false);

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

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Cargar Recibo Digital
  const handleOpenReceipt = async (tripId: number) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setReceiptLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/payments/receipt/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('No se pudo generar el comprobante digital');

      const data = await res.json();
      setSelectedReceipt(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReceiptLoading(false);
    }
  };

  // Abrir Modal para Liquidar Pago
  const handleOpenPayment = async (trip: any) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const finalAmount = Number(trip.fareTotal || trip.finalFare || 25.0);
    setPaymentTrip(trip);
    setPaymentForm({
      paymentMethod: 'qr_bolivia',
      amount: finalAmount,
      transactionReference: '',
      notes: '',
    });
    setQrIntentData(null);

    // Generar intención previa de QR
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/payments/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripId: trip.id,
          paymentMethod: 'qr_bolivia',
          customerName: trip.passenger?.name || trip.tripRequest?.customer?.name || 'Pasajero',
        }),
      });
      if (res.ok) {
        setQrIntentData(await res.json());
      }
    } catch {
      // Intención opcional
    }
  };

  // Confirmar Liquidación de Pago
  const handleConfirmPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || !paymentTrip) return;

    setSubmittingPayment(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripId: paymentTrip.id,
          paymentMethod: paymentForm.paymentMethod,
          amount: Number(paymentForm.amount),
          transactionReference: paymentForm.transactionReference || `PAGO-${Date.now()}`,
          notes: paymentForm.notes || 'Liquidado desde despacho',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al registrar el pago');
      }

      showNotification(`Pago de Bs ${paymentForm.amount} registrado con éxito.`);
      setPaymentTrip(null);
      await fetchTrips();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Abrir o Consultar Factura Fiscal Boliviana (Fase 7.7)
  const handleOpenFiscalInvoice = async (trip: any) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/payments/fiscal-invoice/${trip.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const invoice = await res.json();
        if (invoice && invoice.controlCode) {
          setSelectedFiscalInvoice(invoice);
          return;
        }
      }
    } catch {
      // Si aún no está emitida, abrir formulario
    }

    // Abrir formulario para emitir factura fiscal con NIT
    setFiscalTrip(trip);
    setFiscalForm({
      clientNit: trip.passenger?.nit || trip.tripRequest?.customer?.nit || '',
      clientBusinessName: trip.passenger?.name || trip.tripRequest?.customer?.name || 'CONSUMIDOR FINAL',
      clientEmail: trip.passenger?.email || trip.tripRequest?.customer?.email || '',
    });
  };

  // Emitir Factura Fiscal con Código de Control v7
  const handleIssueFiscalInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token || !fiscalTrip) return;

    setIssuingInvoice(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/payments/fiscal-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tripId: fiscalTrip.id,
          clientNit: fiscalForm.clientNit || '0',
          clientBusinessName: fiscalForm.clientBusinessName || 'CONSUMIDOR FINAL',
          clientEmail: fiscalForm.clientEmail,
          paymentMethod: fiscalTrip.paymentMethod || 'cash',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al emitir la factura fiscal');
      }

      const invoiceData = await res.json();
      setFiscalTrip(null);
      setSelectedFiscalInvoice(invoiceData);
      showNotification(`Factura Fiscal N° ${invoiceData.invoiceNumber} emitida exitosamente.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIssuingInvoice(false);
    }
  };

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

  const getPaymentBadge = (method?: string | null) => {
    switch (method) {
      case 'qr_bolivia':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">📱 QR Simple</span>;
      case 'card':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">💳 Tarjeta</span>;
      case 'cash':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">💵 Efectivo</span>;
      case 'corporate_account':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">🏢 Corporativo</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">⏳ Pendiente</span>;
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
  const totalInProgress = trips.filter((t) => ['IN_PROGRESS', 'ASSIGNED', 'ARRIVED'].includes(t.status)).length;
  const totalRevenue = trips
    .filter((t) => t.status === 'COMPLETED' && (t.fareTotal || t.finalFare))
    .reduce((acc, t) => acc + Number(t.fareTotal || t.finalFare || 0), 0);

  return (
    <AppLayout title="Historial de Viajes & Pagos | RadioTaxi SaaS" onRefresh={fetchTrips} loading={loading}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>📑</span> Historial, Auditoría & Liquidación de Pagos
            </h1>
            <p className="text-sm text-slate-400">
              Trazabilidad completa de la máquina de estados, cobros multicanal (QR Simple Bolivia, Tarjeta, Efectivo) y comprobantes electrónicos.
            </p>
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

        {/* Tarjetas KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Total Viajes</span>
            <span className="text-2xl font-black text-white mt-1 block">{trips.length}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Registrados en sistema</span>
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
            <span className="text-xs text-purple-400 font-mono block uppercase">Liquidación Acumulada</span>
            <span className="text-2xl font-black text-purple-300 mt-1 block">
              Bs {totalRevenue.toFixed(2)}
            </span>
            <span className="text-[11px] text-purple-400/80 mt-1 block">Moneda Boliviana (BOB)</span>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl">
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

        {/* Tabla de Viajes */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">ID</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4">Vehículo & Chofer</th>
                  <th className="py-3.5 px-4">Pasajero</th>
                  <th className="py-3.5 px-4">Ruta</th>
                  <th className="py-3.5 px-4">Método de Pago</th>
                  <th className="py-3.5 px-4 text-right">Tarifa (BOB)</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
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
                  filteredTrips.map((trip) => {
                    const finalFare = trip.fareTotal || trip.finalFare;
                    return (
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
                            {trip.driver?.user?.name || 'Conductor asignado'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-200">
                            {trip.passenger?.name || trip.tripRequest?.customer?.name || 'Pasajero General'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {trip.passenger?.phone || trip.tripRequest?.customer?.phone || 'Sin teléfono'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate">
                          <div className="text-slate-200 font-medium truncate flex items-center gap-1">
                            <span className="text-emerald-400">●</span> {trip.originAddress || trip.tripRequest?.originAddress || 'Origen GPS'}
                          </div>
                          <div className="text-slate-400 text-[11px] truncate flex items-center gap-1">
                            <span className="text-red-400">●</span> {trip.destinationAddress || trip.tripRequest?.destinationAddress || 'Destino por determinar'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {getPaymentBadge(trip.paymentMethod)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-cyan-300 text-sm">
                          {finalFare ? `Bs ${Number(finalFare).toFixed(2)}` : '~Bs 15.00'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenReceipt(trip.id)}
                              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[11px] transition flex items-center gap-1"
                              title="Ver Comprobante Digital"
                            >
                              <span>📄</span> Recibo
                            </button>
                            <button
                              onClick={() => handleOpenFiscalInvoice(trip)}
                              className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-mono text-[11px] font-bold transition flex items-center gap-1"
                              title="Emitir / Ver Factura Fiscal Boliviana (SIN)"
                            >
                              <span>📑</span> Factura
                            </button>
                            <button
                              onClick={() => handleOpenPayment(trip)}
                              className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-mono text-[11px] font-bold transition flex items-center gap-1"
                              title="Liquidar o Confirmar Pago"
                            >
                              <span>💳</span> Cobro
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Comprobante / Recibo Digital Oficial */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp text-slate-200">
            {/* Cabecera del Recibo */}
            <div className="border-b border-slate-800 pb-4 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                  RadioTaxi SaaS Bolivia • Comprobante Digital
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {selectedReceipt.company.name}
                </h3>
                <span className="text-xs text-slate-400 font-mono block">
                  NIT: {selectedReceipt.company.nit}
                </span>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Datos Principales */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <span className="text-slate-400">NÚMERO DE RECIBO:</span>
                <span className="text-white font-bold">{selectedReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <span className="text-slate-400">CÓDIGO DE CONTROL:</span>
                <span className="text-cyan-300 font-bold">{selectedReceipt.authorizationCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">ESTADO / MÉTODO:</span>
                <span className="text-emerald-400 font-bold uppercase">
                  {selectedReceipt.status} ({selectedReceipt.paymentMethod})
                </span>
              </div>
            </div>

            {/* Detalle de Ruta y Vehículo */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-mono block">MÓVIL / CHOFER</span>
                <span className="font-bold text-white block mt-0.5">{selectedReceipt.vehicle.plate}</span>
                <span className="text-slate-400 text-[11px] block">{selectedReceipt.driver.name}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-500 font-mono block">PASAJERO</span>
                <span className="font-bold text-white block mt-0.5">{selectedReceipt.passenger.name}</span>
                <span className="text-slate-400 text-[11px] block">{selectedReceipt.passenger.phone}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-emerald-400">●</span> Origen: <span className="text-white font-medium">{selectedReceipt.route.origin}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="text-red-400">●</span> Destino: <span className="text-white font-medium">{selectedReceipt.route.destination}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Distancia: {selectedReceipt.route.distanceKm} km</span>
                <span>Tiempo: {selectedReceipt.route.durationMinutes} min</span>
              </div>
            </div>

            {/* Desglose de Tarifa */}
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/20 font-mono text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Tarifa Base:</span>
                <span>Bs {selectedReceipt.fareBreakdown.baseFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Recorrido por Distancia:</span>
                <span>Bs {selectedReceipt.fareBreakdown.distanceFare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tiempo en Espera / Tráfico:</span>
                <span>Bs {selectedReceipt.fareBreakdown.timeFare.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black text-white">
                <span className="uppercase text-slate-300">TOTAL PAGADO:</span>
                <span className="text-xl text-cyan-300">
                  Bs {selectedReceipt.fareBreakdown.totalFare.toFixed(2)} BOB
                </span>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 text-center leading-relaxed">
              {selectedReceipt.legalNotice}
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5"
              >
                <span>🖨️</span> Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar / Confirmar Cobro */}
      {paymentTrip && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>💳</span> Liquidar Cobro de Carrera #{paymentTrip.id}
              </h3>
              <button
                onClick={() => setPaymentTrip(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">MÉTODO DE PAGO</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="qr_bolivia">📱 QR Simple Bolivia (BCP / BNB / Interoperable)</option>
                  <option value="cash">💵 Efectivo (Pago en mano al conductor)</option>
                  <option value="card">💳 Tarjeta de Débito / Crédito</option>
                  <option value="corporate_account">🏢 Cuenta B2B Corporativa</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">MONTO A COBRAR (BS)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Preview de QR Simple Bolivia */}
              {paymentForm.paymentMethod === 'qr_bolivia' && qrIntentData && (
                <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 text-center space-y-2">
                  <div className="w-32 h-32 mx-auto bg-white rounded-lg flex items-center justify-center p-2 shadow-md">
                    <div className="text-[9px] font-mono text-slate-900 break-all leading-none">
                      QR SIMPLE BOLIVIA<br/><br/>
                      [ {qrIntentData.paymentDetails?.gloss} ]<br/><br/>
                      Bs {Number(paymentForm.amount).toFixed(2)}
                    </div>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono block">
                    Escanea con banca móvil BCP, BNB, Banco Unión o GanaMóvil
                  </span>
                </div>
              )}

              <div>
                <label className="block text-slate-400 font-mono mb-1">REFERENCIA / NÚMERO DE VOUCHER</label>
                <input
                  type="text"
                  placeholder="Ej. QR-994218 / Voucher POS 0041"
                  value={paymentForm.transactionReference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">NOTAS U OBSERVACIONES</label>
                <textarea
                  rows={2}
                  placeholder="Notas adicionales sobre la liquidación..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentTrip(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  {submittingPayment ? 'Confirmando...' : 'Confirmar Cobro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Formulario para Emitir Factura Fiscal con NIT (Fase 7.7) */}
      {fiscalTrip && !selectedFiscalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-200">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📑</span> Emisión de Factura Fiscal (SIN)
                </h2>
                <p className="text-xs text-slate-400">
                  Carrera #{fiscalTrip.id} • Monto: Bs {Number(fiscalTrip.fareTotal || 25.0).toFixed(2)}
                </p>
              </div>
              <button
                onClick={() => setFiscalTrip(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleIssueFiscalInvoiceSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">
                  NIT O CARNET DE IDENTIDAD (CI) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 1028374029 o 0 para Consumidor Final"
                  value={fiscalForm.clientNit}
                  onChange={(e) => setFiscalForm({ ...fiscalForm, clientNit: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">
                  RAZÓN SOCIAL / NOMBRE COMPLETO *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. BANCO MERCANTIL SANTA CRUZ S.A."
                  value={fiscalForm.clientBusinessName}
                  onChange={(e) => setFiscalForm({ ...fiscalForm, clientBusinessName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">
                  CORREO ELECTRÓNICO (ENVÍO DIGITAL)
                </label>
                <input
                  type="email"
                  placeholder="cliente@empresa.bo"
                  value={fiscalForm.clientEmail}
                  onChange={(e) => setFiscalForm({ ...fiscalForm, clientEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-200">
                ℹ️ La factura se generará con Código de Control v7 y cadena para código QR interoperable con el Servicio de Impuestos Nacionales (SIN).
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setFiscalTrip(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={issuingInvoice}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition disabled:opacity-50"
                >
                  {issuingInvoice ? 'Emitiendo...' : 'Emitir Factura Fiscal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visor / Impresión de Factura Fiscal Oficial Boliviana (Fase 7.7) */}
      {selectedFiscalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp text-slate-200 print:bg-white print:text-black">
            {/* Cabecera y Cuadro Tributario Oficial */}
            <div className="border-b border-slate-800 pb-4 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-base uppercase">
                  {selectedFiscalInvoice.issuer?.name || 'RadioTaxi Bolivia S.R.L.'}
                </h3>
                <p className="text-slate-400 text-xs">CASA MATRIZ: {selectedFiscalInvoice.issuer?.address}</p>
                <p className="text-slate-400 text-xs">TELÉFONO: {selectedFiscalInvoice.issuer?.phone}</p>
                <p className="text-slate-400 text-xs">{selectedFiscalInvoice.issuer?.city}</p>
              </div>

              {/* Cuadro NIT / N° Factura / Autorización */}
              <div className="border-2 border-indigo-500/60 rounded-xl p-2.5 bg-indigo-950/20 text-right text-xs font-mono">
                <div>NIT: <strong className="text-white">{selectedFiscalInvoice.issuer?.nit}</strong></div>
                <div>FACTURA N°: <strong className="text-indigo-400">{selectedFiscalInvoice.invoiceNumber}</strong></div>
                <div>AUTORIZACIÓN: <span className="text-[11px] text-slate-300">{selectedFiscalInvoice.authorizationNumber}</span></div>
              </div>
            </div>

            <div className="text-center font-bold font-mono text-sm tracking-wider text-cyan-400">
              FACTURA
              <span className="block text-[10px] text-slate-400 font-sans font-normal">
                (Con Derecho a Crédito Fiscal)
              </span>
            </div>

            {/* Datos del Cliente */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Fecha de Emisión:</span>
                <span className="font-mono text-white">{selectedFiscalInvoice.issuedAt?.slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Señor(es):</span>
                <span className="font-bold text-white uppercase">{selectedFiscalInvoice.client?.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NIT / CI:</span>
                <span className="font-mono font-bold text-cyan-300">{selectedFiscalInvoice.client?.nit}</span>
              </div>
            </div>

            {/* Concepto y Detalle Económico */}
            <table className="w-full text-xs text-left border-y border-slate-800 py-2">
              <thead className="text-[10px] text-slate-400 font-mono uppercase">
                <tr>
                  <th className="py-1">Cant.</th>
                  <th className="py-1">Concepto</th>
                  <th className="py-1 text-right">P. Unit</th>
                  <th className="py-1 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                <tr>
                  <td className="py-2 font-mono">1</td>
                  <td className="py-2">
                    <span className="font-medium text-slate-200 block">Servicio de Radiotaxi / Transporte de Pasajeros</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {selectedFiscalInvoice.tripDetails?.origin} → {selectedFiscalInvoice.tripDetails?.destination}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono">
                    Bs {Number(selectedFiscalInvoice.financialBreakdown?.subtotal || 25.0).toFixed(2)}
                  </td>
                  <td className="py-2 text-right font-mono font-bold text-white">
                    Bs {Number(selectedFiscalInvoice.financialBreakdown?.total || 25.0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Resumen Fiscal de Impuestos */}
            <div className="space-y-1 text-xs border-b border-slate-800 pb-3">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono text-cyan-300">
                  Bs {Number(selectedFiscalInvoice.financialBreakdown?.total || 25.0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Importe Base Crédito Fiscal:</span>
                <span className="font-mono">
                  Bs {Number(selectedFiscalInvoice.financialBreakdown?.baseTaxCredit || 25.0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-indigo-300 font-medium text-[11px]">
                <span>Crédito Fiscal IVA (13%):</span>
                <span className="font-mono">
                  Bs {Number(selectedFiscalInvoice.financialBreakdown?.ivaTaxCredit || 3.25).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Código de Control y Datos Técnicos SIN */}
            <div className="flex items-center justify-between text-[11px] font-mono bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Código de Control (v7):</span>
                <strong className="text-purple-300 text-xs tracking-wider">{selectedFiscalInvoice.controlCode}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[9px] uppercase">Fecha Límite de Emisión:</span>
                <span className="text-slate-300">{selectedFiscalInvoice.limitEmissionDate || '31/12/2026'}</span>
              </div>
            </div>

            {/* Leyenda Fiscal Oficial Ley 453 */}
            <div className="p-2 bg-slate-950/40 rounded-lg text-[9px] text-slate-400 text-center leading-tight">
              &quot;{selectedFiscalInvoice.legend}&quot;
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedFiscalInvoice(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-xs"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-1 text-xs"
              >
                <span>🖨️</span> Imprimir Factura
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
