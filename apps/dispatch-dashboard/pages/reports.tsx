import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '/api-proxy';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/+$/, '')}/api`;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setReports(await res.json());
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExportCSV = () => {
    const headers = ['ID', 'Empresa', 'Periodo', 'Total Viajes', 'Monto Facturado (BOB)', 'Estado'];
    const rows = reports.map((r) => [
      r.id,
      r.company?.name || 'RadioTaxi Demo',
      `${r.periodStart || '2026-09-01'} a ${r.periodEnd || '2026-09-30'}`,
      r.totalTrips || 0,
      r.totalAmount || 0,
      r.status || 'GENERATED',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reporte_radiotaxi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AppLayout title="Métricas y Reportes | RadioTaxi SaaS" onRefresh={fetchReports} loading={loading}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>📈</span> Métricas & Facturación Corporativa (B2B)
            </h1>
            <p className="text-sm text-slate-400">
              Control de facturación por centros de costo, liquidación a flotas y estados financieros.
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar Reporte (CSV)
          </button>
        </div>

        {/* Tarjetas KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Ingresos Totales</span>
            <span className="text-2xl font-black text-emerald-300 mt-1 block">Bs 18,450.00</span>
            <span className="text-[11px] text-emerald-500/80 mt-1 block">+12.4% vs mes anterior</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Carreras Despachadas</span>
            <span className="text-2xl font-black text-cyan-300 mt-1 block">1,248</span>
            <span className="text-[11px] text-cyan-500/80 mt-1 block">98.2% efectividad</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Tiempo Promedio ETA</span>
            <span className="text-2xl font-black text-indigo-300 mt-1 block">4.8 min</span>
            <span className="text-[11px] text-indigo-400 mt-1 block">Asignación por IA</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-xl">
            <span className="text-xs text-slate-500 font-mono block uppercase">Cuentas Corporativas</span>
            <span className="text-2xl font-black text-purple-300 mt-1 block">14 Empresas</span>
            <span className="text-[11px] text-purple-400 mt-1 block">Facturación quincenal B2B</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Tabla de Reportes Generados */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📊</span> Cierres Periódicos de Facturación
            </h2>
            <span className="text-xs text-slate-400 font-mono">Moneda: BOB (Bolivianos)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Periodo de Facturación</th>
                  <th className="py-3 px-4">Empresa / Cliente</th>
                  <th className="py-3 px-4 text-center">Viajes Realizados</th>
                  <th className="py-3 px-4 text-right">Monto Total</th>
                  <th className="py-3 px-4 text-right">Comisión RadioTaxi</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reports.length === 0 ? (
                  <>
                    <tr className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-300">Septiembre 2026 (Quincena 1)</td>
                      <td className="py-3.5 px-4 font-bold text-white">Banco Nacional Demo S.A.</td>
                      <td className="py-3.5 px-4 text-center font-mono">142 viajes</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">Bs 4,820.00</td>
                      <td className="py-3.5 px-4 text-right font-mono text-cyan-300">Bs 482.00</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          CONCILIADO
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-300">Septiembre 2026 (Quincena 1)</td>
                      <td className="py-3.5 px-4 font-bold text-white">Minera Andina Corp</td>
                      <td className="py-3.5 px-4 text-center font-mono">89 viajes</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">Bs 3,115.00</td>
                      <td className="py-3.5 px-4 text-right font-mono text-cyan-300">Bs 311.50</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          CONCILIADO
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-300">Agosto 2026 (Mes Completo)</td>
                      <td className="py-3.5 px-4 font-bold text-white">Consorcio Jurídico La Paz</td>
                      <td className="py-3.5 px-4 text-center font-mono">210 viajes</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">Bs 6,780.00</td>
                      <td className="py-3.5 px-4 text-right font-mono text-cyan-300">Bs 678.00</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                          FACTURADO
                        </span>
                      </td>
                    </tr>
                  </>
                ) : (
                  reports.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-300">{r.title || `Reporte #${r.id}`}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{r.company?.name || 'Cliente B2B'}</td>
                      <td className="py-3.5 px-4 text-center font-mono">{r.totalTrips || 0} viajes</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        Bs {Number(r.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-cyan-300">
                        Bs {(Number(r.totalAmount || 0) * 0.1).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {r.status || 'GENERATED'}
                        </span>
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
