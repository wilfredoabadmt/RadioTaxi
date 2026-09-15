// ============================================================================
// RadioTaxi Pricing Engine (Single Source of Truth for Fare Calculations)
// Microservicio + Librería Compartida para Tarifas y Cotizaciones
// ============================================================================

import http from 'http';
import { isPointInPolygon } from '../../../packages/shared/utils/src';
import { FareBreakdown } from '../../../packages/shared/types/src';

export interface PricingRuleData {
  id: number;
  companyId?: number;
  name?: string;
  type?: string;
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
  name?: string;
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
  scheduledAt?: string;
}

/**
 * Determina si una fecha/hora corresponde a franjas horarias pico en Bolivia:
 * - Horas pico laborales: 07:00 a 09:30 y 18:00 a 20:30 (Lunes a Viernes)
 * - Turno nocturno de fin de semana: Viernes a Domingo 23:00 a 05:00
 */
export function isPeakHour(date: Date = new Date()): { isPeak: boolean; reason?: string } {
  const day = date.getDay(); // 0 = Domingo, 1 = Lunes, ... 6 = Sábado
  const hour = date.getHours();
  const minute = date.getMinutes();
  const timeVal = hour + minute / 60;

  // Horas pico laborales
  const isWeekday = day >= 1 && day <= 5;
  if (isWeekday) {
    if (timeVal >= 7.0 && timeVal <= 9.5) {
      return { isPeak: true, reason: 'Hora pico matutina laboral (07:00 - 09:30)' };
    }
    if (timeVal >= 18.0 && timeVal <= 20.5) {
      return { isPeak: true, reason: 'Hora pico vespertina laboral (18:00 - 20:30)' };
    }
  }

  // Turno nocturno de fin de semana
  if (day === 5 || day === 6 || day === 0) {
    if (timeVal >= 23.0 || timeVal <= 5.0) {
      return { isPeak: true, reason: 'Tarifa nocturna de fin de semana (23:00 - 05:00)' };
    }
  }

  return { isPeak: false };
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
 * Calcula la tarifa determinista aplicando regla base, distancia, duración, geocercas y multiplicador pico dinámico.
 */
export function calculateTripFare(options: CalculateFareOptions): FareBreakdown & { isPeakHour?: boolean; peakReason?: string } {
  const {
    rule,
    geofences = [],
    distanceKm,
    durationMinutes,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    scheduledAt,
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

  // Evaluación de horario pico
  let peakMultiplier = Number(rule.peakMultiplier || 1);
  let isPeak = false;
  let peakReason: string | undefined;

  if (scheduledAt) {
    const checkDate = new Date(scheduledAt);
    const peakInfo = isPeakHour(checkDate);
    isPeak = peakInfo.isPeak;
    peakReason = peakInfo.reason;
    peakMultiplier = isPeak ? Number(rule.peakMultiplier || 1) : 1.0;
  } else {
    const currentPeakInfo = isPeakHour(new Date());
    isPeak = currentPeakInfo.isPeak;
    peakReason = currentPeakInfo.reason;
  }

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
    isPeakHour: isPeak,
    peakReason,
    totalFare,
    distanceMeters: Math.round(distanceKm * 1000),
    durationSeconds: Math.round(durationMinutes * 60),
    currency: 'BOB',
  };
}

// ---------------------------------------------------------------------------
// Servidor HTTP Microservicio (POST /price)
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT) || 3005;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  if (url.pathname === '/health' || url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'UP', service: 'pricing-engine', port: PORT }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/price') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const payload: CalculateFareOptions = JSON.parse(body || '{}');
        if (!payload.rule) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'La regla de precios "rule" es obligatoria' }));
          return;
        }

        const breakdown = calculateTripFare(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(breakdown));
      } catch (err: any) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Payload inválido' }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada en pricing-engine' }));
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[pricing-engine] 💰 Microservicio escuchando en http://localhost:${PORT}`);
  });
}
