import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Power, MapPin, Navigation, User, DollarSign, Bell, Star, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DriverApp = () => {
  const [online, setOnline] = useState(false);
  const [newTrip, setNewTrip] = useState<any>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);

  // Simulation: Trigger a new trip alert after being online for 3 seconds
  useEffect(() => {
    if (online && !newTrip && !activeTrip) {
      const timer = setTimeout(() => {
        setNewTrip({
          id: 'TR-8829',
          passenger: 'Alejandro M.',
          rating: 4.8,
          pickup: 'Av. 20 de Octubre, La Paz',
          destination: 'Aeropuerto El Alto',
          estFare: 'Bs. 45.00',
          distance: '2.5 km'
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [online, newTrip, activeTrip]);

  const acceptTrip = () => {
    setActiveTrip(newTrip);
    setNewTrip(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500/30 overflow-hidden relative">
      <Head>
        <title>RadioTaxi Driver | Panel de Chófer</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* TOP HEADER */}
      <nav className="relative z-20 px-6 py-4 flex justify-between items-center bg-slate-900 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-emerald-500 p-0.5">
            <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop')] bg-cover rounded-full" />
          </div>
          <div>
            <p className="text-sm font-bold">Mateo Rivera</p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Star className="w-2.5 h-2.5 text-amber-500 fill-current" /> 4.95 • Toyota Corolla
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Hoy</p>
            <p className="text-sm font-bold text-emerald-400">Bs. 215.50</p>
          </div>
          <Bell className="w-6 h-6 text-slate-400" />
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="relative z-10 p-6">
        
        {/* ONLINE TOGGLE */}
        <div className={`
          p-6 rounded-3xl border transition-all duration-500 flex items-center justify-between
          ${online ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-slate-900 border-white/5 opacity-80'}
        `}>
          <div>
            <h2 className="text-xl font-bold">{online ? 'Conectado' : 'Fuera de servicio'}</h2>
            <p className="text-sm text-slate-400">{online ? 'Buscando pasajeros cerca...' : 'Pulsa el botón para recibir viajes'}</p>
          </div>
          <button 
            onClick={() => setOnline(!online)}
            className={`
              w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95
              ${online ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-800 text-slate-500'}
            `}
          >
            <Power className="w-8 h-8" />
          </button>
        </div>

        {/* STATUS CARDS */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs text-slate-500">Viajes hoy</p>
          </div>
          <div className="bg-slate-900 p-4 rounded-2xl border border-white/5">
            <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">6.5h</p>
            <p className="text-xs text-slate-500">Tiempo online</p>
          </div>
        </div>

        {/* ACTIVE TRIP INFO */}
        <AnimatePresence>
          {activeTrip && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mt-8 bg-indigo-600 rounded-[32px] p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Navigation className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-widest mb-4">Viaje en curso</p>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold">{activeTrip.passenger}</h3>
                    <p className="text-indigo-200 text-sm flex items-center gap-1">
                       {activeTrip.destination}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">Bs. {activeTrip.estFare}</p>
                    <p className="text-xs text-indigo-300">Cobro efectivo</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button className="flex-1 bg-white text-indigo-600 py-4 rounded-2xl font-bold active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Navigation className="w-5 h-5" /> Abrir Maps
                  </button>
                  <button 
                    onClick={() => setActiveTrip(null)}
                    className="flex-1 bg-indigo-800 text-white py-4 rounded-2xl font-bold active:scale-95 transition-all"
                  >
                    Completar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!activeTrip && !newTrip && (
          <div className="mt-20 text-center opacity-40">
             <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-900">
               <MapPin className="w-10 h-10 text-slate-500" />
             </div>
             <p className="text-sm">Área de alta demanda: Sopocachi</p>
          </div>
        )}
      </main>

      {/* NEW TRIP MODAL */}
      <AnimatePresence>
        {newTrip && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md"
          >
             <motion.div 
               initial={{ y: 200 }}
               animate={{ y: 0 }}
               exit={{ y: 200 }}
               className="w-full max-w-md bg-white text-slate-900 rounded-[40px] p-8 shadow-2xl"
             >
                <div className="flex justify-between items-center mb-8">
                  <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Car className="w-8 h-8" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Nueva Solicitud</p>
                    <p className="text-2xl font-black text-indigo-600">{newTrip.estFare}</p>
                  </div>
                </div>

                <div className="space-y-6 mb-8">
                   <div className="flex items-start gap-4">
                     <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                     <div>
                       <p className="text-xs text-slate-400 uppercase font-bold">Recogida</p>
                       <p className="font-bold">{newTrip.pickup}</p>
                     </div>
                   </div>
                   <div className="flex items-start gap-4">
                     <div className="w-3 h-3 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                     <div>
                       <p className="text-xs text-slate-400 uppercase font-bold">Destino</p>
                       <p className="font-bold">{newTrip.destination}</p>
                     </div>
                   </div>
                </div>

                <div className="flex gap-4">
                   <button 
                     onClick={() => setNewTrip(null)}
                     className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                   >
                     <X className="w-8 h-8" />
                   </button>
                   <button 
                     onClick={acceptTrip}
                     className="flex-1 bg-indigo-600 text-white rounded-2xl font-bold text-xl active:scale-95 transition-all shadow-xl shadow-indigo-200"
                   >
                     ACEPTAR VIAJE
                   </button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        body { background: #020617; }
        .antialiased { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      `}</style>
    </div>
  );
};

export default DriverApp;
