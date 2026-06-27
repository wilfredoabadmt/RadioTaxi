import { PrismaClient } from '@prisma/client';
import { parseGeoJsonPolygon, pointInPolygon } from './geo.utils';

// Reutiliza el prisma del módulo principal; lo importamos como singleton.
// Si se usa standalone, se crea aquí.
let _prisma: PrismaClient | null = null;
export function getPrisma(prisma?: PrismaClient): PrismaClient {
  if (prisma) return prisma;
  if (!_prisma) _prisma = new PrismaClient();
  return _prisma;
}

export interface FareBreakdown {
  ruleId: number;
  baseFare: number;
  distanceCost: number;
  timeCost: number;
  geofenceSurcharge: number;
  tollSurcharge: number;
  peakMultiplier: number;
  total: number;
}

/**
 * Busca la regla de tarifa activa de una empresa.
 * Si no se especifica companyId, toma la primera regla activa.
 */
async function findActiveRule(companyId?: number) {
  const prisma = getPrisma();
  return prisma.pricingRule.findFirst({
    where: {
      companyId,
      active: true,
    },
    orderBy: { id: 'asc' },
  });
}

/**
 * Calcula el recargo por geofences (misma lógica que PricingService del API).
 */
function getGeofenceSurcharge(
  geofences: { areaGeoJson: string | null; surcharge: number }[],
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
): number {
  let surcharge = 0;

  for (const geofence of geofences) {
    if (!geofence.areaGeoJson) continue;

    const polygon = parseGeoJsonPolygon(geofence.areaGeoJson);
    if (!polygon) continue;

    const inOrigin = pointInPolygon(originLat, originLng, polygon);
    const inDestination = pointInPolygon(destinationLat, destinationLng, polygon);

    if (inOrigin || inDestination) {
      surcharge += Number(geofence.surcharge || 0);
    }
  }

  return surcharge;
}

/**
 * Calcula la tarifa de un viaje dado:
 * - company: para obtener la regla activa y geofences
 * - distanceKm / durationMinutes: métricas del viaje
 * - coords: para evaluar geofences
 *
 * Devuelve el desglose completo + total.
 */
export async function calculateFare(params: {
  companyId: number;
  distanceKm: number;
  durationMinutes: number;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
}): Promise<FareBreakdown> {
  const rule = await findActiveRule(params.companyId);

  if (!rule) {
    // Sin regla → tarifa 0 (se puede mejorar con un default)
    return {
      ruleId: 0,
      baseFare: 0,
      distanceCost: 0,
      timeCost: 0,
      geofenceSurcharge: 0,
      tollSurcharge: 0,
      peakMultiplier: 1,
      total: 0,
    };
  }

  // Obtener geofences de la empresa
  const prisma2 = getPrisma();
  const geofences = await prisma2.geofence.findMany({
    where: { companyId: params.companyId },
  });

  const geofenceSurcharge =
    params.originLat != null && params.originLng != null &&
    params.destinationLat != null && params.destinationLng != null
      ? getGeofenceSurcharge(
          geofences,
          params.originLat,
          params.originLng,
          params.destinationLat,
          params.destinationLng,
        )
      : 0;

  const base = Number(rule.baseFare || 0);
  const distanceCost = params.distanceKm * Number(rule.kmRate || 0);
  const timeCost = params.durationMinutes * Number(rule.minuteRate || 0);
  const tollSurcharge = Number(rule.tollSurcharge || 0);
  const peakMultiplier = Number(rule.peakMultiplier || 1);

  const fare = Math.max(
    base + distanceCost + timeCost + geofenceSurcharge + tollSurcharge,
    Number(rule.minFare || 0),
  );

  const total = parseFloat((fare * peakMultiplier).toFixed(2));

  return {
    ruleId: rule.id,
    baseFare: base,
    distanceCost,
    timeCost,
    geofenceSurcharge,
    tollSurcharge,
    peakMultiplier,
    total,
  };
}

/**
 * Persiste el TripFare en BD y actualiza el Trip con el fareTotal.
 */
export async function saveFare(params: {
  tripId: number;
  ruleId: number;
  distanceMeters: number;
  durationSeconds: number;
  totalFare: number;
  baseFare: number;
}) {
  const prisma = getPrisma();
  await prisma.$transaction(async (tx) => {
    await tx.tripFare.create({
      data: {
        tripId: params.tripId,
        pricingRuleId: params.ruleId,
        baseFare: params.baseFare,
        distanceMeters: params.distanceMeters,
        durationSeconds: params.durationSeconds,
        totalFare: params.totalFare,
      },
    });

    await tx.trip.update({
      where: { id: params.tripId },
      data: { fareTotal: params.totalFare },
    });
  });
}
