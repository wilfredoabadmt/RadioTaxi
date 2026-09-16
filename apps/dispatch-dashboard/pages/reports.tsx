import { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { handleAuthExpired } from '../utils/api';

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
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal para generar nuevo reporte
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    title: 'Reporte Quincenal Consolidado',
    periodStart: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
  });
  const [generating, setGenerating] = useState(false);

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

      if (res.status === 401) {
        handleAuthExpired();
        return;
      }

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

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Generar reporte en backend
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setGenerating(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/reports/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: reportForm.title,
          periodStart: new Date(reportForm.periodStart).toISOString(),
          periodEnd: new Date(reportForm.periodEnd).toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Error al generar el reporte Excel');

      showNotification('Reporte consolidado generado con libro Excel oficial');
      setShowGenerateModal(false);
      await fetchReports();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // Descargar archivo Excel binario
  const handleDownloadExcel = async (reportId: number, title: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/reports/${reportId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('No se pudo descargar el archivo Excel');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${reportId}-${title.replace(/\s+/g, '_')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AppLayout title="Métricas y Reportes | RadioTaxi SaaS" onRefresh={fetchReports} loading={loading}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>📈</span> Métricas, Liquidación & Reportes Excel (XLSX)
            </h1>
            <p className="text-sm text-slate-400">
              Generación de informes consolidados de viajes, facturación oficial y descarga directa en formato Microsoft Excel.
            </p>
          </div>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition flex items-center gap-2"
          >
            <span>➕</span> Generar Reporte Excel (.xlsx)
          </button>
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
            <span className="text-xs text-slate-500 font-mono block uppercase">Ingresos Totales</span>
            <span className="text-2xl font-black text-emerald-300 mt-1 block">Bs 18,450.00</span>
            <span className="text-[11px] text-emerald-500/80 mt-1 block">+12.4% vs periodo previo</span>
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
            <span className="text-xs text-slate-500 font-mono block uppercase">Reportes Generados</span>
            <span className="text-2xl font-black text-purple-300 mt-1 block">{reports.length}</span>
            <span className="text-[11px] text-purple-400 mt-1 block">Libros Excel disponibles</span>
          </div>
        </div>

        {/* Tabla de Reportes */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider font-mono border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Título del Reporte</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Periodo Evaluado</th>
                  <th className="py-3 px-4 text-center">Viajes</th>
                  <th className="py-3 px-4 text-right">Facturación</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                      No se han generado reportes ejecutivos aún. Haz clic en &quot;Generar Reporte Excel&quot;.
                    </td>
                  </tr>
                ) : (
                  reports.map((r) => {
                    const data = r.data || {};
                    return (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                          #{r.id}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          {r.title}
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {r.company?.name || 'RadioTaxi Bolivia'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {r.periodStart ? new Date(r.periodStart).toLocaleDateString('es-BO') : 'N/A'} -{' '}
                          {r.periodEnd ? new Date(r.periodEnd).toLocaleDateString('es-BO') : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-cyan-300">
                          {data.totalTrips ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          Bs {Number(data.totalRevenue || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleDownloadExcel(r.id, r.title)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-bold transition flex items-center gap-1.5 mx-auto"
                            title="Descargar libro Excel .xlsx"
                          >
                            <span>📥</span> Descargar .xlsx
                          </button>
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

      {/* Modal Generar Reporte */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📊</span> Generar Reporte Consolidado Excel
              </h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-mono mb-1">TÍTULO DEL REPORTE</label>
                <input
                  type="text"
                  required
                  value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">FECHA INICIO</label>
                  <input
                    type="date"
                    required
                    value={reportForm.periodStart}
                    onChange={(e) => setReportForm({ ...reportForm, periodStart: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">FECHA FIN</label>
                  <input
                    type="date"
                    required
                    value={reportForm.periodEnd}
                    onChange={(e) => setReportForm({ ...reportForm, periodEnd: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                El backend recopilará todos los viajes en ese rango, calculará ingresos, distancias y generará un archivo Excel (.xlsx) estructurado listo para auditoría.
              </p>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                >
                  {generating ? 'Generando...' : 'Generar y Exportar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
