// ============================================================================
// RadioTaxi Pricing Engine (Single Source of Truth for Fare Calculations)
// ============================================================================

import { isPointInPolygon } from '../../../packages/shared/utils/src';
import { FareBreakdown } from '../../../packages/shared/types/src';

export interface PricingRuleData {
  id: number;
  companyId?: number;
  baseFare: number;
  kmRate: number;
  minuteRate: number;
  minFare: number;
  tollSurcharge?: number;
  geofenceSurcharge?: number;
  peakMultiplier?: number;
}

export interface GeofenceData {
  id?: number;
  companyId?: number;
  areaGeoJson?: string | null;
  surcharge: number;
}

export interface CalculateFareOptions {
  rule: PricingRuleData;
  geofences?: GeofenceData[];
  distanceKm: number;
  durationMinutes: number;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
}

/**
 * Parsea polígonos GeoJSON a formato de coordenadas [lat, lng][].
 */
export function parseGeoJsonPolygon(geoJsonString: string): [number, number][] | null {
  try {
    const geo = JSON.parse(geoJsonString);
    let coords: number[][];

    if (geo.type === 'Feature' && geo.geometry?.coordinates) {
      coords = geo.geometry.coordinates[0];
    } else if (geo.type === 'Polygon' && geo.coordinates) {
      coords = geo.coordinates[0];
    } else {
      return null;
    }

    // Convertir de [lng, lat] (estándar GeoJSON) a [lat, lng]
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}

/**
 * Calcula el recargo por geocercas evaluando origen y destino contra los polígonos definidos.
 */
export function calculateGeofenceSurcharges(
  geofences: GeofenceData[],
  originLat?: number,
  originLng?: number,
  destinationLat?: number,
  destinationLng?: number
): number {
  if (originLat == null || originLng == null || destinationLat == null || destinationLng == null) {
    return 0;
  }

  let totalSurcharge = 0;

  for (const geofence of geofences) {
    if (!geofence.areaGeoJson) continue;

    const polygon = parseGeoJsonPolygon(geofence.areaGeoJson);
    if (!polygon) continue;

    const inOrigin = isPointInPolygon([originLat, originLng], polygon);
    const inDestination = isPointInPolygon([destinationLat, destinationLng], polygon);

    if (inOrigin || inDestination) {
      totalSurcharge += Number(geofence.surcharge || 0);
    }
  }

  return totalSurcharge;
}

/**
 * Calcula la tarifa determinista aplicando regla base, distancia, duración, geocercas y multiplicador pico.
 */
export function calculateTripFare(options: CalculateFareOptions): FareBreakdown {
  const {
    rule,
    geofences = [],
    distanceKm,
    durationMinutes,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
  } = options;

  const baseFare = Number(rule.baseFare || 0);
  const distanceFare = Number((distanceKm * Number(rule.kmRate || 0)).toFixed(2));
  const timeFare = Number((durationMinutes * Number(rule.minuteRate || 0)).toFixed(2));
  const tollSurcharge = Number(rule.tollSurcharge || 0);
  const geofenceSurcharge = calculateGeofenceSurcharges(
    geofences,
    originLat,
    originLng,
    destinationLat,
    destinationLng
  );
  const peakMultiplier = Number(rule.peakMultiplier || 1);

  const subtotal = baseFare + distanceFare + timeFare + tollSurcharge + geofenceSurcharge;
  const fareBeforeMultiplier = Math.max(subtotal, Number(rule.minFare || 0));
  const totalFare = Number((fareBeforeMultiplier * peakMultiplier).toFixed(2));

  return {
    baseFare,
    distanceFare,
    timeFare,
    surcharges: tollSurcharge + geofenceSurcharge,
    tollSurcharge,
    geofenceSurcharge,
    peakMultiplier,
    totalFare,
    distanceMeters: Math.round(distanceKm * 1000),
    durationSeconds: Math.round(durationMinutes * 60),
    currency: 'BOB',
  };
}
