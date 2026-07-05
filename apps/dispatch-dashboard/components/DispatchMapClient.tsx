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
  shadowSize: [41, 41]
});

L.Icon.Default.mergeOptions(defaultIcon.options);

interface DispatchMapClientProps {
  tripRequests: Array<any>;
  vehicles: Array<any>;
}

const DispatchMapClient = ({ tripRequests, vehicles }: DispatchMapClientProps) => {
  const mapCenter = useMemo(() => {
    const firstRequest = tripRequests.find((request) => request.originLat && request.originLng);
    if (firstRequest) {
      return [firstRequest.originLat, firstRequest.originLng] as [number, number];
    }

    const firstVehicle = vehicles.find((vehicle) => vehicle.currentLatitude && vehicle.currentLongitude);
    if (firstVehicle) {
      return [firstVehicle.currentLatitude, firstVehicle.currentLongitude] as [number, number];
    }

    return [-16.4897, -68.1193] as [number, number];
  }, [tripRequests, vehicles]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={12}
      style={{ width: '100%', minHeight: 360, borderRadius: 18 }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {tripRequests
        .filter((request) => request.originLat && request.originLng)
        .map((request) => (
          <Marker key={`origin-${request.id}`} position={[request.originLat, request.originLng]}>
            <Popup>
              <strong>Origen</strong>
              <div>{request.originAddress}</div>
            </Popup>
          </Marker>
        ))}

      {tripRequests
        .filter((request) => request.destinationLat && request.destinationLng)
        .map((request) => (
          <Marker key={`dest-${request.id}`} position={[request.destinationLat, request.destinationLng]}>
            <Popup>
              <strong>Destino</strong>
              <div>{request.destinationAddress}</div>
            </Popup>
          </Marker>
        ))}

      {vehicles
        .filter((vehicle) => vehicle.currentLatitude && vehicle.currentLongitude)
        .map((vehicle) => (
          <CircleMarker
            key={`vehicle-${vehicle.id}`}
            center={[vehicle.currentLatitude, vehicle.currentLongitude]}
            pathOptions={{ color: '#2563eb', fillColor: '#2563eb' }}
            radius={8}
          >
            <Popup>
              <strong>Vehículo</strong>
              <div>{vehicle.plate || 'Sin placa'}</div>
              <div>Estado: {vehicle.status}</div>
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
};

export default DispatchMapClient;
