// ---------------------------------------------------------------------------
// Utilidades geográficas (standalone, sin dependencias externas)
// Replicadas del servicio API para que el realtime calcule tarifas de forma autónoma.
// ---------------------------------------------------------------------------

/**
 * Distancia en metros entre dos puntos (Haversine).
 */
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Punto (lat, lng) dentro de un polígono (ray-casting).
 */
export function pointInPolygon(lat: number, lng: number, polygonCoordinates: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygonCoordinates.length - 1; i < polygonCoordinates.length; j = i++) {
    const xi = polygonCoordinates[i][1];
    const yi = polygonCoordinates[i][0];
    const xj = polygonCoordinates[j][1];
    const yj = polygonCoordinates[j][0];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi);

    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Parsea un string GeoJSON (Polygon o Feature) a array de coordenadas [lat, lng].
 */
export function parseGeoJsonPolygon(areaGeoJson: string): number[][] | null {
  try {
    const geojson = JSON.parse(areaGeoJson);
    if (geojson.type === 'Polygon' && Array.isArray(geojson.coordinates)) {
      return geojson.coordinates[0].map((coord: any) => [coord[1], coord[0]]);
    }
    if (geojson.type === 'Feature' && geojson.geometry?.type === 'Polygon') {
      return geojson.geometry.coordinates[0].map((coord: any) => [coord[1], coord[0]]);
    }
  } catch {
    return null;
  }
  return null;
}
