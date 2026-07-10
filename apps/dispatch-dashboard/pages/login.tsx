import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fillFeedback, setFillFeedback] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Si ya está logueado, redirigir al index
    if (localStorage.getItem('token')) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Usar variable de entorno si existe, o valor por defecto
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    
    try {
      const res = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Credenciales inválidas');
      }
      if (data.user.role !== 'ADMIN' && data.user.role !== 'DISPATCHER') {
        throw new Error('Acceso restringido: Solo Administradores o Despachadores.');
      }
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (role: 'admin' | 'dispatcher') => {
    if (role === 'admin') {
      setEmail('admin@radiotaxi.demo');
      setPassword('password123');
      setFillFeedback('Admin credentials loaded!');
    } else {
      setEmail('dispatcher@radiotaxi.demo');
      setPassword('password123');
      setFillFeedback('Dispatcher credentials loaded!');
    }
    
    setTimeout(() => {
      setFillFeedback('');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden font-sans">
      <Head>
        <title>RadioTaxi SaaS - Login</title>
        <meta name="description" content="Inicia sesión en el panel de control de despacho futurista de RadioTaxi SaaS." />
      </Head>

      {/* Cyberpunk Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: `
            linear-gradient(to right, #06b6d4 1px, transparent 1px),
            linear-gradient(to bottom, #06b6d4 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Futuristic Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none animate-cyber-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-magenta-500/10 blur-[120px] pointer-events-none animate-cyber-pulse" style={{ animationDelay: '-4s' }} />

      {/* Main glassmorphism card container */}
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel shadow-2xl relative z-10 mx-4 border border-cyan-500/20 glow-cyan">
        
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 rounded-br-lg" />

        <div className="flex flex-col items-center mb-8">
          {/* Logo / Brand Header */}
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-4 group relative overflow-hidden">
            <span className="text-slate-950 font-extrabold text-2xl tracking-tighter z-10">RT</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </div>
          
          <h1 className="text-white font-bold text-3xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-200 to-magenta-400">
            RadioTaxi SaaS
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
            <p className="text-cyan-400/80 text-xs font-semibold uppercase tracking-widest">
              Panel de Despacho
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm font-medium flex items-start gap-3 glow-red animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {fillFeedback && (
          <div className="mb-6 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-semibold flex items-center gap-2 animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{fillFeedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="correo@radiotaxi.com"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm font-medium"
              />
              <span className="absolute right-3.5 top-3.5 text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                </svg>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-4 pr-10 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-cyan-400 transition-colors"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 5.656m0 0l-8.228 8.228m8.228-8.228a5.99 5.99 0 0011.66 0m0 0l8.228 8.228" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 active:scale-[0.98] text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all duration-300 flex items-center justify-center gap-2 mt-8 disabled:opacity-50 disabled:pointer-events-none tracking-wide text-sm"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Entrar al Sistema
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </button>
        </form>

        {/* Demo Quick Access Credentials Section */}
        <div className="mt-8 pt-6 border-t border-slate-800/60">
          <p className="text-center text-slate-500 text-xs font-semibold uppercase tracking-wider mb-4">
            Accesos de Demostración
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleQuickFill('admin')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900/50 transition-all group"
            >
              <span className="text-cyan-400 font-bold text-xs group-hover:text-cyan-300">Admin</span>
              <span className="text-[10px] text-slate-500 mt-1">Click para rellenar</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('dispatcher')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-magenta-500/40 hover:bg-slate-900/50 transition-all group"
            >
              <span className="text-magenta-400 font-bold text-xs group-hover:text-magenta-300">Despachador</span>
              <span className="text-[10px] text-slate-500 mt-1">Click para rellenar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
