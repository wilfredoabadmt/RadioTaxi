import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  Polyline,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultIcon = new L.Icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

L.Icon.Default.mergeOptions(defaultIcon.options);

// Controlador para auto-centrado y seguimiento dinámico (Fase 5.8)
function MapFocusHandler({ targetCoords }: { targetCoords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoords && targetCoords[0] != null && targetCoords[1] != null) {
      map.flyTo(targetCoords, 14, { duration: 1.0 });
    }
  }, [targetCoords, map]);
  return null;
}

export interface DispatchMapClientProps {
  tripRequests?: Array<any>;
  vehicles?: Array<any>;
  selectedTripRequest?: any | null;
  selectedVehicleId?: number | null;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  onSelectVehicle?: (vehicleId: number) => void;
}

const DispatchMapClient = ({
  tripRequests = [],
  vehicles = [],
  selectedTripRequest = null,
  selectedVehicleId = null,
  centerLat = -16.5,
  centerLng = -68.15,
  zoom = 13,
  onSelectVehicle,
}: DispatchMapClientProps) => {
  const [vehicleFilter, setVehicleFilter] = useState<'ALL' | 'available' | 'busy' | 'offline'>('ALL');

  // Coordenadas para auto-centrar
  const focusCoords = useMemo<[number, number] | null>(() => {
    if (selectedTripRequest?.originLat && selectedTripRequest?.originLng) {
      return [selectedTripRequest.originLat, selectedTripRequest.originLng];
    }
    if (selectedVehicleId) {
      const v = vehicles.find((veh) => veh.id === selectedVehicleId);
      const lat = v?.currentLat || v?.currentLatitude;
      const lng = v?.currentLng || v?.currentLongitude;
      if (lat && lng) return [lat, lng];
    }
    return null;
  }, [selectedTripRequest, selectedVehicleId, vehicles]);

  // Filtrado de vehículos
  const filteredVehicles = useMemo(() => {
    if (vehicleFilter === 'ALL') return vehicles;
    return vehicles.filter((v) => v.status === vehicleFilter);
  }, [vehicles, vehicleFilter]);

  // Trazado de ruta activa (Fase 5.8)
  const activeRouteCoords = useMemo<Array<[number, number]>>(() => {
    if (!selectedTripRequest) return [];
    const coords: Array<[number, number]> = [];

    // Si hay un vehículo seleccionado o asignado, incluir su punto inicial
    if (selectedVehicleId) {
      const v = vehicles.find((veh) => veh.id === selectedVehicleId);
      const lat = v?.currentLat || v?.currentLatitude;
      const lng = v?.currentLng || v?.currentLongitude;
      if (lat && lng) {
        coords.push([lat, lng]);
      }
    }

    if (selectedTripRequest.originLat && selectedTripRequest.originLng) {
      coords.push([selectedTripRequest.originLat, selectedTripRequest.originLng]);
    }

    if (selectedTripRequest.destinationLat && selectedTripRequest.destinationLng) {
      coords.push([selectedTripRequest.destinationLat, selectedTripRequest.destinationLng]);
    }

    return coords;
  }, [selectedTripRequest, selectedVehicleId, vehicles]);

  const initialCenter = useMemo(() => {
    const firstRequest = tripRequests.find((r) => r.originLat && r.originLng);
    if (firstRequest) {
      return [firstRequest.originLat, firstRequest.originLng] as [number, number];
    }
    const firstVehicle = vehicles.find((v) => (v.currentLat || v.currentLatitude) && (v.currentLng || v.currentLongitude));
    if (firstVehicle) {
      const lat = firstVehicle.currentLat || firstVehicle.currentLatitude;
      const lng = firstVehicle.currentLng || firstVehicle.currentLongitude;
      return [lat, lng] as [number, number];
    }
    return [centerLat, centerLng] as [number, number];
  }, [tripRequests, vehicles, centerLat, centerLng]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex flex-col">
      {/* Barra de Filtros Rápidos de Flota sobre el Mapa (Fase 5.8) */}
      <div className="absolute top-3 right-3 z-[1000] bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 flex items-center gap-1 shadow-xl">
        <button
          type="button"
          onClick={() => setVehicleFilter('ALL')}
          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition ${
            vehicleFilter === 'ALL'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Todos ({vehicles.length})
        </button>
        <button
          type="button"
          onClick={() => setVehicleFilter('available')}
          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 ${
            vehicleFilter === 'available'
              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
              : 'text-emerald-400/70 hover:text-emerald-300'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Libres ({vehicles.filter((v) => v.status === 'available').length})
        </button>
        <button
          type="button"
          onClick={() => setVehicleFilter('busy')}
          className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 ${
            vehicleFilter === 'busy'
              ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
              : 'text-amber-400/70 hover:text-amber-300'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          En Ruta ({vehicles.filter((v) => v.status === 'busy').length})
        </button>
      </div>

      <MapContainer
        center={initialCenter}
        zoom={zoom}
        style={{ width: '100%', height: '100%', minHeight: 460, borderRadius: 12 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapFocusHandler targetCoords={focusCoords} />

        {/* Marcadores de Solicitudes Pendientes (Origen) */}
        {tripRequests
          .filter((r) => r.originLat && r.originLng)
          .map((request) => {
            const isSelected = selectedTripRequest?.id === request.id;
            return (
              <Marker
                key={`origin-${request.id}`}
                position={[request.originLat, request.originLng]}
              >
                <Popup>
                  <div className="text-xs space-y-1">
                    <span className="font-bold text-slate-900 block">📍 Origen Carrera #{request.id}</span>
                    <span className="text-slate-600 block">{request.originAddress || 'Coordenadas GPS'}</span>
                    <span className="text-slate-500 text-[10px] block">
                      Pasajero: {request.passengerName || 'General'}
                    </span>
                  </div>
                </Popup>
                {isSelected && (
                  <Tooltip permanent direction="top" offset={[0, -32]}>
                    <span className="text-[10px] font-bold text-cyan-600 font-mono">
                      #{request.id} Solicitud Activa
                    </span>
                  </Tooltip>
                )}
              </Marker>
            );
          })}

        {/* Marcadores de Destino */}
        {tripRequests
          .filter((r) => r.destinationLat && r.destinationLng)
          .map((request) => (
            <Marker
              key={`dest-${request.id}`}
              position={[request.destinationLat, request.destinationLng]}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">🏁 Destino Carrera #{request.id}</span>
                  <span className="text-slate-600 block">{request.destinationAddress || 'Coordenadas GPS'}</span>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Trazado de Ruta Activa (Polyline - Fase 5.8) */}
        {activeRouteCoords.length >= 2 && (
          <Polyline
            positions={activeRouteCoords}
            pathOptions={{
              color: '#06b6d4',
              weight: 4,
              opacity: 0.85,
              dashArray: '8, 8',
            }}
          >
            <Tooltip permanent direction="center">
              <span className="text-[10px] font-mono font-bold text-cyan-700 bg-white/90 px-1 py-0.5 rounded shadow">
                Ruta Despacho #{selectedTripRequest?.id}
              </span>
            </Tooltip>
          </Polyline>
        )}

        {/* Vehículos con Telemetría GPS en Vivo */}
        {filteredVehicles
          .filter((v) => (v.currentLat || v.currentLatitude) && (v.currentLng || v.currentLongitude))
          .map((vehicle) => {
            const lat = vehicle.currentLat || vehicle.currentLatitude;
            const lng = vehicle.currentLng || vehicle.currentLongitude;
            const isAvailable = vehicle.status === 'available';
            const isBusy = vehicle.status === 'busy';
            const isSelected = selectedVehicleId === vehicle.id;

            const markerColor = isSelected
              ? '#38bdf8'
              : isAvailable
              ? '#10b981'
              : isBusy
              ? '#f59e0b'
              : '#64748b';

            return (
              <CircleMarker
                key={`vehicle-${vehicle.id}`}
                center={[lat, lng]}
                pathOptions={{
                  color: isSelected ? '#ffffff' : markerColor,
                  fillColor: markerColor,
                  fillOpacity: isSelected ? 0.95 : 0.8,
                  weight: isSelected ? 3 : 1.5,
                }}
                radius={isSelected ? 12 : 9}
                eventHandlers={{
                  click: () => onSelectVehicle && onSelectVehicle(vehicle.id),
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 font-mono text-sm">🚗 {vehicle.plate}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : isBusy
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {vehicle.status}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      {vehicle.brand} {vehicle.model} ({vehicle.color || 'Blanco'})
                    </div>
                    {vehicle.driver?.user?.name && (
                      <div className="text-slate-500 text-[11px]">👤 {vehicle.driver.user.name}</div>
                    )}
                    {vehicle.driver?.user?.phone && (
                      <div className="text-slate-500 text-[11px] font-mono">
                        📞 {vehicle.driver.user.phone}
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
      </MapContainer>
    </div>
  );
};

export default DispatchMapClient;
