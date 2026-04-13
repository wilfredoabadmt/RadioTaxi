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
    return [-16.4897, -68.1193] as [number, number];
  }, []);

  return (
    <MapContainer center={mapCenter} zoom={12} style={{ width: '100%', minHeight: 360, borderRadius: 18 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    </MapContainer>
  );
};
export default DispatchMapClient;
