import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

interface CorporateAccount {
  id: number;
  clientCompanyName: string;
  contactName?: string | null;
  contactEmail?: string | null;
  paymentTerms?: string | null;
  creditLimit: number;
  totalSpent: number;
  availableCredit: number;
  reservationsCount: number;
}

interface CostCenter {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  budgetCenter?: string | null;
  _count?: {
    corporateReservations: number;
  };
}

interface CorporateReservation {
  id: number;
  reservationStatus: string;
  tripReason?: string | null;
  estimatedCost?: number | null;
  createdAt: string;
  corporateAccount: {
    clientCompanyName: string;
  };
  costCenter?: {
    name: string;
    code: string;
  } | null;
  tripRequest: {
    scheduledAt: string;
    originAddress: string;
    destinationAddress: string;
    customer?: {
      name: string;
      phone: string;
    };
  };
}

export default function CorporatePage() {
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [reservations, setReservations] = useState<CorporateReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tab activo
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'RESERVATIONS' | 'COST_CENTERS'>('ACCOUNTS');

  // Modales
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountForm, setAccountForm] = useState({
    clientCompanyName: '',
    contactName: '',
    contactEmail: '',
    paymentTerms: 'Crédito a 30 días con factura',
    creditLimit: 10000,
  });

  const [showCenterModal, setShowCenterModal] = useState(false);
  const [centerForm, setCenterForm] = useState({
    code: '',
    name: '',
    description: '',
    budgetCenter: 'ADMINISTRACION',
  });

  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationForm, setReservationForm] = useState({
    corporateAccountId: 1,
    costCenterId: undefined as number | undefined,
    customerId: 1,
    scheduledAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
    originAddress: '',
    destinationAddress: '',
    tripReason: 'Traslado corporativo para reunión ejecutiva',
    estimatedCost: 50,
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchB2BData = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const headers = { Authorization: `Bearer ${token}` };

      const [accRes, costRes, resRes] = await Promise.all([
        fetch(`${baseUrl}/corporate/accounts`, { headers }),
        fetch(`${baseUrl}/corporate/cost-centers`, { headers }),
        fetch(`${baseUrl}/corporate/reservations`, { headers }),
      ]);

      if (accRes.ok) setAccounts(await accRes.json());
      if (costRes.ok) setCostCenters(await costRes.json());
      if (resRes.ok) setReservations(await resRes.json());
    } catch (err: any) {
      setError(err?.message || 'Error al sincronizar datos B2B');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchB2BData();
  }, []);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Crear Cuenta Corporativa
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setSubmitting(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/corporate/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...accountForm,
          companyId: 1,
          creditLimit: Number(accountForm.creditLimit),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al crear cuenta corporativa');
      }

      showNotification('Empresa cliente B2B registrada exitosamente');
      setShowAccountModal(false);
      setAccountForm({
        clientCompanyName: '',
        contactName: '',
        contactEmail: '',
        paymentTerms: 'Crédito a 30 días con factura',
        creditLimit: 10000,
      });
      await fetchB2BData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Crear Centro de Costo
  const handleSaveCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setSubmitting(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/corporate/cost-centers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...centerForm,
          companyId: 1,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al crear centro de costo');
      }

      showNotification('Centro de costo registrado con éxito');
      setShowCenterModal(false);
      setCenterForm({ code: '', name: '', description: '', budgetCenter: 'ADMINISTRACION' });
      await fetchB2BData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Crear Reserva Programada
  const handleSaveReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setSubmitting(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/corporate/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...reservationForm,
          corporateAccountId: Number(reservationForm.corporateAccountId),
          costCenterId: reservationForm.costCenterId ? Number(reservationForm.costCenterId) : undefined,
          customerId: Number(reservationForm.customerId),
          estimatedCost: Number(reservationForm.estimatedCost),
          scheduledAt: new Date(reservationForm.scheduledAt).toISOString(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Error al programar reserva corporativa');
      }

      showNotification('Reserva corporativa programada con éxito');
      setShowReservationModal(false);
      await fetchB2BData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCreditLimit = accounts.reduce((sum, a) => sum + Number(a.creditLimit || 0), 0);
  const totalSpentAll = accounts.reduce((sum, a) => sum + Number(a.totalSpent || 0), 0);

  return (
    <AppLayout title="Clientes B2B & Corporativo | RadioTaxi SaaS" onRefresh={fetchB2BData} loading={loading}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>🏢</span> Plataforma Corporativa B2B
            </h1>
            <p className="text-sm text-slate-400">
              Gestión de convenios empresariales, líneas de crédito, centros de costo departamentales y reservas programadas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAccountModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5"
            >
              <span>➕</span> Nueva Empresa B2B
            </button>
            <button
              onClick={() => setShowReservationModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <span>📅</span> Programar Reserva
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

        {/* Tarjetas KPI B2B */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Empresas Clientes</span>
            <span className="text-2xl font-black text-white mt-1 block">{accounts.length}</span>
            <span className="text-[11px] text-slate-400 mt-1 block">Convenios corporativos</span>
          </div>

          <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-cyan-400 font-mono block uppercase">Línea de Crédito Total</span>
            <span className="text-2xl font-black text-cyan-300 mt-1 block">Bs {totalCreditLimit.toFixed(2)}</span>
            <span className="text-[11px] text-cyan-500/80 mt-1 block">Asignado a clientes B2B</span>
          </div>

          <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-purple-400 font-mono block uppercase">Consumo del Periodo</span>
            <span className="text-2xl font-black text-purple-300 mt-1 block">Bs {totalSpentAll.toFixed(2)}</span>
            <span className="text-[11px] text-purple-400/80 mt-1 block">Pendiente de facturación</span>
          </div>

          <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-indigo-400 font-mono block uppercase">Reservas Programadas</span>
            <span className="text-2xl font-black text-indigo-300 mt-1 block">{reservations.length}</span>
            <span className="text-[11px] text-indigo-400/80 mt-1 block">Viajes agendados</span>
          </div>
        </div>

        {/* Pestañas de Navegación B2B */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 text-xs font-mono">
          <button
            onClick={() => setActiveTab('ACCOUNTS')}
            className={`px-4 py-2 rounded-xl transition font-bold flex items-center gap-2 ${
              activeTab === 'ACCOUNTS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <span>🏢</span> Convenios y Cuentas ({accounts.length})
          </button>
          <button
            onClick={() => setActiveTab('RESERVATIONS')}
            className={`px-4 py-2 rounded-xl transition font-bold flex items-center gap-2 ${
              activeTab === 'RESERVATIONS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <span>📅</span> Reservas Programadas ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTab('COST_CENTERS')}
            className={`px-4 py-2 rounded-xl transition font-bold flex items-center gap-2 ${
              activeTab === 'COST_CENTERS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
            }`}
          >
            <span>🏷️</span> Centros de Costo ({costCenters.length})
          </button>
        </div>

        {/* TAB 1: Cuentas Corporativas */}
        {activeTab === 'ACCOUNTS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800 font-mono text-xs">
                No hay cuentas corporativas registradas. Crea una con el botón superior.
              </div>
            ) : (
              accounts.map((acc) => {
                const usedPercent = Math.min(100, Math.round((acc.totalSpent / (acc.creditLimit || 1)) * 100));
                return (
                  <div
                    key={acc.id}
                    className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-white text-base tracking-tight">
                          {acc.clientCompanyName}
                        </h3>
                        <span className="text-xs text-slate-400 block mt-0.5 font-mono">
                          {acc.contactName || 'Sin contacto directo'}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {acc.reservationsCount} Viajes
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-800/60 text-xs font-mono">
                      <div className="flex justify-between text-slate-400">
                        <span>Límite Crédito:</span>
                        <span className="text-white font-bold">Bs {Number(acc.creditLimit).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Consumo Actual:</span>
                        <span className="text-purple-300 font-bold">Bs {Number(acc.totalSpent).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Disponible:</span>
                        <span className="text-emerald-400 font-bold">Bs {Number(acc.availableCredit).toFixed(2)}</span>
                      </div>

                      {/* Barra de progreso de consumo */}
                      <div className="w-full bg-slate-950 rounded-full h-2 mt-2 overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            usedPercent > 85 ? 'bg-red-500' : usedPercent > 60 ? 'bg-amber-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${usedPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 text-right block">
                        {usedPercent}% de crédito utilizado
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{acc.paymentTerms || 'Crédito Estándar'}</span>
                      <span className="text-cyan-400 font-bold">{acc.contactEmail || ''}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: Reservas Programadas */}
        {activeTab === 'RESERVATIONS' && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">ID</th>
                    <th className="py-3.5 px-4">Empresa B2B</th>
                    <th className="py-3.5 px-4">Fecha Programada</th>
                    <th className="py-3.5 px-4">Pasajero</th>
                    <th className="py-3.5 px-4">Ruta</th>
                    <th className="py-3.5 px-4">Centro Costo</th>
                    <th className="py-3.5 px-4 text-right">Presupuesto (BOB)</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reservations.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-mono">
                        No hay reservas corporativas agendadas.
                      </td>
                    </tr>
                  ) : (
                    reservations.map((res) => (
                      <tr key={res.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                          #{res.id}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {res.corporateAccount?.clientCompanyName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-300">
                          {new Date(res.tripRequest.scheduledAt).toLocaleString('es-BO', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-medium text-slate-200 block">
                            {res.tripRequest.customer?.name || 'Empleado Corporativo'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {res.tripReason || 'Sin motivo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-[11px]">
                          <div className="truncate"><span className="text-emerald-400">●</span> {res.tripRequest.originAddress}</div>
                          <div className="truncate text-slate-400"><span className="text-red-400">●</span> {res.tripRequest.destinationAddress}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                            {res.costCenter?.code || 'GENERAL'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-cyan-300">
                          Bs {Number(res.estimatedCost || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                            {res.reservationStatus}
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

        {/* TAB 3: Centros de Costo */}
        {activeTab === 'COST_CENTERS' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCenterModal(true)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                <span>🏷️</span> Nuevo Centro de Costo
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {costCenters.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 font-mono text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
                  No se han registrado centros de costo.
                </div>
              ) : (
                costCenters.map((cc) => (
                  <div
                    key={cc.id}
                    className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                        {cc.code}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {cc._count?.corporateReservations || 0} Viajes
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-sm mt-1">{cc.name}</h4>
                    <p className="text-xs text-slate-400">{cc.description || 'Sin descripción adicional'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Nueva Empresa B2B */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🏢</span> Registrar Empresa Cliente Corporativa (B2B)
              </h3>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">RAZÓN SOCIAL / NOMBRE EMPRESA</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Cervecería Boliviana Nacional S.A."
                  value={accountForm.clientCompanyName}
                  onChange={(e) => setAccountForm({ ...accountForm, clientCompanyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">CONTACTO / REPRESENTANTE</label>
                  <input
                    type="text"
                    placeholder="Ej. Lic. Carlos Mendoza"
                    value={accountForm.contactName}
                    onChange={(e) => setAccountForm({ ...accountForm, contactName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">CORREO DE FACTURACIÓN</label>
                  <input
                    type="email"
                    placeholder="cmendoza@empresa.bo"
                    value={accountForm.contactEmail}
                    onChange={(e) => setAccountForm({ ...accountForm, contactEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">LÍMITE DE CRÉDITO (BS)</label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    value={accountForm.creditLimit}
                    onChange={(e) => setAccountForm({ ...accountForm, creditLimit: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">TÉRMINOS DE PAGO</label>
                  <input
                    type="text"
                    value={accountForm.paymentTerms}
                    onChange={(e) => setAccountForm({ ...accountForm, paymentTerms: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Cuenta B2B'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Centro de Costo */}
      {showCenterModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🏷️</span> Registrar Centro de Costo
              </h3>
              <button
                onClick={() => setShowCenterModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCenter} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">CÓDIGO INTERNO</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. CC-LOGISTICA"
                    value={centerForm.code}
                    onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">DEPARTAMENTO</label>
                  <input
                    type="text"
                    required
                    placeholder="Logística y Abastecimiento"
                    value={centerForm.name}
                    onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">DESCRIPCIÓN DEL GASTO</label>
                <textarea
                  rows={2}
                  placeholder="Movilidad y despacho de mercaderías..."
                  value={centerForm.description}
                  onChange={(e) => setCenterForm({ ...centerForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCenterModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Crear Centro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Programar Reserva B2B */}
      {showReservationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📅</span> Programar Viaje Corporativo
              </h3>
              <button
                onClick={() => setShowReservationModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveReservation} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">EMPRESA B2B</label>
                  <select
                    value={reservationForm.corporateAccountId}
                    onChange={(e) => setReservationForm({ ...reservationForm, corporateAccountId: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.clientCompanyName} (Bs {Number(acc.availableCredit).toFixed(0)} disp.)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">CENTRO DE COSTO</label>
                  <select
                    value={reservationForm.costCenterId || ''}
                    onChange={(e) => setReservationForm({ ...reservationForm, costCenterId: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">General (Sin asignar)</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} - {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-mono mb-1">FECHA Y HORA PROGRAMADA</label>
                <input
                  type="datetime-local"
                  required
                  value={reservationForm.scheduledAt}
                  onChange={(e) => setReservationForm({ ...reservationForm, scheduledAt: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PUNTO DE RECOGIDA</label>
                  <input
                    type="text"
                    required
                    placeholder="Av. Arce #2400"
                    value={reservationForm.originAddress}
                    onChange={(e) => setReservationForm({ ...reservationForm, originAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">PUNTO DE DESTINO</label>
                  <input
                    type="text"
                    required
                    placeholder="Aeropuerto Internacional El Alto"
                    value={reservationForm.destinationAddress}
                    onChange={(e) => setReservationForm({ ...reservationForm, destinationAddress: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">PRESUPUESTO ESTIMADO (BS)</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={reservationForm.estimatedCost}
                    onChange={(e) => setReservationForm({ ...reservationForm, estimatedCost: parseFloat(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">MOTIVO DE TRASLADO</label>
                  <input
                    type="text"
                    placeholder="Visita a cliente / Directorio"
                    value={reservationForm.tripReason}
                    onChange={(e) => setReservationForm({ ...reservationForm, tripReason: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReservationModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
                >
                  {submitting ? 'Agendando...' : 'Confirmar Reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
