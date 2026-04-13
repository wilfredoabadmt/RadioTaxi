import React from 'react';

const MapPlaceholder = () => {
  return (
    <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center text-slate-500 gap-4">
      <div className="w-16 h-16 rounded-full bg-slate-300 animate-pulse flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.163-7.39 11.728a1.1 1.1 0 0 1-1.22 0C9.539 20.163 4 14.993 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
      <div className="text-center">
        <p className="font-medium">Cargando Mapa de Despacho...</p>
        <p className="text-xs">Ubicando unidades en tiempo real</p>
      </div>
    </div>
  );
};

export default MapPlaceholder;
