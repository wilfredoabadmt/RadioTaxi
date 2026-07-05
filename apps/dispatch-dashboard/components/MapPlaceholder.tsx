import dynamic from 'next/dynamic';

const DispatchMapClient = dynamic(() => import('./DispatchMapClient'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: 360,
      borderRadius: 18,
      background: 'linear-gradient(135deg, #e0f2fe 0%, #f8fafc 100%)',
      border: '1px solid #cbd5e1',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: '#0f172a',
      textAlign: 'center',
      padding: 24
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
      <h3 style={{ margin: 0, fontSize: 22 }}>Cargando mapa de OpenStreetMap...</h3>
    </div>
  )
});

const MapPlaceholder = ({ tripRequests, vehicles }: { tripRequests: Array<any>; vehicles: Array<any> }) => {
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
      <DispatchMapClient tripRequests={tripRequests} vehicles={vehicles} />
    </div>
  );
};

export default MapPlaceholder;
