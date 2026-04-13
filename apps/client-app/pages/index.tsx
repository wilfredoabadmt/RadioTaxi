import React, { useState } from 'react';
import Head from 'next/head';
import { MapPin, Navigation, Search, Car, Clock, Shield, Menu, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ClientApp = () => {
  const [step, setStep] = useState('home'); // home, estimating, waiting, trip
  const [destination, setDestination] = useState('');

  const services = [
    { id: 'standard', name: 'RadioTaxi Standard', price: 'Bs. 15.00', eta: '3 min', icon: <Car className="w-6 h-6" /> },
    { id: 'comfort', name: 'Confort Plus', price: 'Bs. 22.00', eta: '5 min', icon: <Shield className="w-6 h-6" /> },
    { id: 'vip', name: 'Premium VIP', price: 'Bs. 35.00', eta: '8 min', icon: <Star className="w-6 h-6 text-amber-500" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-indigo-500/30 overflow-hidden relative">
      <Head>
        <title>RadioTaxi Passenger | Pedir un taxi</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </Head>

      {/* BACKGROUND MAP SIMULATION */}
      <div className="absolute inset-0 z-0 opacity-40 grayscale pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950" />
        <div className="w-full h-full bg-slate-900 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]" />
      </div>

      {/* TOP NAVBAR */}
      <nav className="relative z-20 px-6 py-4 flex justify-between items-center bg-slate-950/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Navigation className="w-5 h-5 text-white fill-current" />
          </div>
          <span className="font-bold text-lg tracking-tight">RadioTaxi</span>
        </div>
        <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </nav>

      {/* CONTENT AREA */}
      <main className="relative z-10 p-6 flex flex-col h-[calc(100vh-72px)] justify-end">
        
        <AnimatePresence mode="wait">
          {step === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h2 className="text-2xl font-bold mb-6">¿A dónde vamos hoy?</h2>
                
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500" />
                    <input 
                      type="text" 
                      readOnly
                      placeholder="Ubicación actual"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-slate-300 focus:outline-none"
                    />
                  </div>
                  
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
                    <input 
                      type="text" 
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Ingresa tu destino"
                      className="w-full bg-white/10 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>

                <button 
                  onClick={() => setStep('estimating')}
                  disabled={!destination}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  Confirmar Destino
                </button>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {['Trabajo', 'Casa', 'Gimnasio', 'Supermercado'].map((place) => (
                  <button key={place} className="flex-none px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm font-medium hover:bg-white/10 transition-colors">
                    {place}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'estimating' && (
            <motion.div 
              key="estimating"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 rounded-t-[40px] px-6 py-8 -mx-6 -mb-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] border-t border-white/10"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-8" />
              <h3 className="text-xl font-bold mb-6 flex items-center justify-between">
                Elige tu viaje
                <span className="text-sm font-normal text-slate-400">Ruta optimizada ✅</span>
              </h3>

              <div className="space-y-3">
                {services.map((service) => (
                  <button 
                    key={service.id}
                    onClick={() => setStep('waiting')}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                        {service.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{service.name}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {service.eta} de espera
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{service.price}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Efectivo</p>
                    </div>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setStep('home')}
                className="w-full mt-6 py-4 text-slate-500 font-medium hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </motion.div>
          )}

          {step === 'waiting' && (
            <motion.div 
              key="waiting"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] p-8 text-center"
            >
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full animate-ping opacity-20" />
                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full animate-pulse" />
                <div className="absolute inset-4 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Car className="w-8 h-8 text-white animate-bounce" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">Buscando conductor...</h3>
              <p className="text-slate-400 mb-8">Estamos conectándote con el taxi más cercano. Tiempo estimado: 45 seg.</p>
              
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4 text-left mb-8">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Viaje Seguro</p>
                  <p className="text-xs text-slate-400">Todos nuestros conductores están verificados.</p>
                </div>
              </div>

              <button 
                onClick={() => setStep('home')}
                className="text-rose-500 font-bold hover:text-rose-400 transition-colors"
              >
                Cancelar Búsqueda
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MOBILE STYLING FIXES */}
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        body { background: #020617; }
      `}</style>
    </div>
  );
};

export default ClientApp;
