import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalculateFareDto } from './dto/calculate-fare.dto';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { parseGeoJsonPolygon, pointInPolygon } from '../common/geojson.util';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaService) {}

  findRules(companyId?: number) {
    return this.prisma.pricingRule.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { id: 'asc' }
    });
  }

  async findOneRule(id: number) {
    const rule = await this.prisma.pricingRule.findUnique({ where: { id } });
    if (!rule) {
      throw new NotFoundException(`Regla de tarificación #${id} no encontrada`);
    }
    return rule;
  }

  createRule(dto: CreatePricingRuleDto) {
    return this.prisma.pricingRule.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        type: dto.type ?? 'STANDARD',
        baseFare: dto.baseFare,
        kmRate: dto.kmRate,
        minuteRate: dto.minuteRate,
        minFare: dto.minFare,
        tollSurcharge: dto.tollSurcharge ?? 0,
        geofenceSurcharge: dto.geofenceSurcharge ?? 0,
        peakMultiplier: dto.peakMultiplier ?? 1.0,
        areaGeoJson: dto.areaGeoJson ?? null,
        active: dto.active ?? true,
      }
    });
  }

  async updateRule(id: number, dto: UpdatePricingRuleDto) {
    await this.findOneRule(id);
    return this.prisma.pricingRule.update({
      where: { id },
      data: dto,
    });
  }

  async deleteRule(id: number) {
    await this.findOneRule(id);

    // Verificar si la regla está vinculada a viajes históricos en TripFare
    const fareCount = await this.prisma.tripFare.count({
      where: { pricingRuleId: id }
    });

    if (fareCount > 0) {
      // Desactivar en lugar de eliminar físicamente para preservar auditoría fiscal
      return this.prisma.pricingRule.update({
        where: { id },
        data: { active: false },
      });
    }

    return this.prisma.pricingRule.delete({
      where: { id }
    });
  }

  findGeofences(companyId?: number) {
    return this.prisma.geofence.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: { id: 'asc' }
    });
  }

  async findOneGeofence(id: number) {
    const geofence = await this.prisma.geofence.findUnique({ where: { id } });
    if (!geofence) {
      throw new NotFoundException(`Geocerca #${id} no encontrada`);
    }
    return geofence;
  }

  createGeofence(dto: CreateGeofenceDto) {
    return this.prisma.geofence.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        type: dto.type ?? 'ZONE',
        surcharge: dto.surcharge,
        areaGeoJson: dto.areaGeoJson,
      }
    });
  }

  async updateGeofence(id: number, dto: UpdateGeofenceDto) {
    await this.findOneGeofence(id);
    return this.prisma.geofence.update({
      where: { id },
      data: dto,
    });
  }

  async deleteGeofence(id: number) {
    await this.findOneGeofence(id);
    return this.prisma.geofence.delete({
      where: { id }
    });
  }

  private getGeofenceSurcharge(
    // Cambiamos el tipo a 'any[]' para evitar conflictos de validación estrictos
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
    
    // Obtenemos las geocercas
    const geofences = await this.prisma.geofence.findMany({ where: { companyId } });
    
    // Pasamos las geocercas usando 'as any' para saltar la validación de tipos rebelde
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