// ============================================================================
// RadioTaxi Shared Utilities (Single Source of Truth)
// ============================================================================

/**
 * Formatea un monto numérico a formato de moneda de Bolivia (BOB / Bs).
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Radio de la Tierra en metros para cálculos geodésicos.
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Calcula la distancia ortodrómica en metros entre dos coordenadas GPS (Fórmula de Haversine).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Alias retrocompatible para servicios existentes
 */
export const getDistanceMeters = calculateHaversineDistance;

/**
 * Estima el tiempo de llegada (ETA) en minutos dada la distancia en metros y velocidad promedio (km/h).
 * Por defecto 25 km/h para tráfico urbano.
 */
export function estimateEtaMinutes(distanceMeters: number, averageSpeedKmh: number = 25): number {
  const speedMps = (averageSpeedKmh * 1000) / 3600;
  const seconds = distanceMeters / speedMps;
  return Math.max(1, Math.round(seconds / 60));
}

/**
 * Verifica si un punto GPS se encuentra dentro de un polígono (Bounding Box o Ray-Casting).
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [lat, lng] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
