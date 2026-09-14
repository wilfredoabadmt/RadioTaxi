import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
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

export interface DispatchMapClientProps {
  tripRequests?: Array<any>;
  vehicles?: Array<any>;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
}

const DispatchMapClient = ({
  tripRequests = [],
  vehicles = [],
  centerLat = -16.5,
  centerLng = -68.15,
  zoom = 13,
}: DispatchMapClientProps) => {
  const mapCenter = useMemo(() => {
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
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ width: '100%', height: '100%', minHeight: 440, borderRadius: 12 }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {tripRequests
        .filter((r) => r.originLat && r.originLng)
        .map((request) => (
          <Marker key={`origin-${request.id}`} position={[request.originLat, request.originLng]}>
            <Popup>
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-900 block">📍 Origen Carrera #{request.id}</span>
                <span className="text-slate-600 block">{request.originAddress || 'Coordenadas GPS'}</span>
                <span className="text-slate-500 text-[10px] block">Pasajero: {request.passengerName || 'General'}</span>
              </div>
            </Popup>
          </Marker>
        ))}

      {tripRequests
        .filter((r) => r.destinationLat && r.destinationLng)
        .map((request) => (
          <Marker key={`dest-${request.id}`} position={[request.destinationLat, request.destinationLng]}>
            <Popup>
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-900 block">🏁 Destino Carrera #{request.id}</span>
                <span className="text-slate-600 block">{request.destinationAddress || 'Coordenadas GPS'}</span>
              </div>
            </Popup>
          </Marker>
        ))}

      {vehicles
        .filter((v) => (v.currentLat || v.currentLatitude) && (v.currentLng || v.currentLongitude))
        .map((vehicle) => {
          const lat = vehicle.currentLat || vehicle.currentLatitude;
          const lng = vehicle.currentLng || vehicle.currentLongitude;
          const isAvailable = vehicle.status === 'available';
          const isBusy = vehicle.status === 'busy';
          const markerColor = isAvailable ? '#10b981' : isBusy ? '#f59e0b' : '#64748b';

          return (
            <CircleMarker
              key={`vehicle-${vehicle.id}`}
              center={[lat, lng]}
              pathOptions={{ color: markerColor, fillColor: markerColor, fillOpacity: 0.8 }}
              radius={9}
            >
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 font-mono text-sm">🚗 {vehicle.plate}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
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
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
    </MapContainer>
  );
};

export default DispatchMapClient;
