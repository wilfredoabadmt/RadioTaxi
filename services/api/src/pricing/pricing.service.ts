import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalculateFareDto } from './dto/calculate-fare.dto';
import { parseGeoJsonPolygon, pointInPolygon } from '../common/geojson.util';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  findRules(companyId?: number) {
    return this.prisma.pricingRule.findMany({
      where: { companyId },
      orderBy: { id: 'asc' }
    });
  }

  findGeofences(companyId?: number) {
    return this.prisma.geofence.findMany({
      where: { companyId },
      orderBy: { id: 'asc' }
    });
  }

  private getGeofenceSurcharge(
    geofences: any[], 
    originLat?: number,
    originLng?: number,
    destinationLat?: number,
    destinationLng?: number
  ) {
    if (originLat == null || originLng == null || destinationLat == null || destinationLng == null) {
      return 0;
    }

    let surcharge = 0;

    geofences.forEach((geofence) => {
      if (!geofence.areaGeoJson) {
        return;
      }

      const polygon = parseGeoJsonPolygon(geofence.areaGeoJson);
      if (!polygon) {
        return;
      }

      const inOrigin = pointInPolygon(originLat, originLng, polygon);
      const inDestination = pointInPolygon(destinationLat, destinationLng, polygon);
      if (inOrigin || inDestination) {
        surcharge += Number(geofence.surcharge || 0);
      }
    });

    return surcharge;
  }

  async calculateFare(data: CalculateFareDto) {
    const rule = await this.prisma.pricingRule.findUnique({
      where: { id: data.ruleId }
    });

    if (!rule) {
      throw new NotFoundException('Pricing rule not found');
    }

    const companyId = data.companyId ?? rule.companyId;
    
    const geofences = await this.prisma.geofence.findMany({ where: { companyId } });
    
    const geofenceSurcharge = this.getGeofenceSurcharge(
      geofences as any,
      data.originLat,
      data.originLng,
      data.destinationLat,
      data.destinationLng
    );

    const base = Number(rule.baseFare || 0);
    const distanceCost = data.distanceKm * Number(rule.kmRate || 0);
    const timeCost = data.durationMinutes * Number(rule.minuteRate || 0);
    const tollSurcharge = Number(rule.tollSurcharge || 0);
    const peakMultiplier = Number(rule.peakMultiplier || 1);

    const fare = Math.max(
      base + distanceCost + timeCost + geofenceSurcharge + tollSurcharge,
      Number(rule.minFare || 0)
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
      total
    };
  }
}
