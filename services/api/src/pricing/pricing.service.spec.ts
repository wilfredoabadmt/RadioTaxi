import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PricingService (SDD Fare Calculation Contract)', () => {
  let service: PricingService;

  const mockPrisma: any = {
    pricingRule: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tripFare: {
      count: jest.fn(),
    },
    geofence: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    jest.clearAllMocks();
  });

  describe('CRUD de PricingRules', () => {
    it('debe crear una nueva regla de tarificación', async () => {
      const dto = {
        companyId: 1,
        name: 'Tarifa Aeropuerto',
        baseFare: 15,
        kmRate: 4,
        minuteRate: 0.8,
        minFare: 20,
      };

      mockPrisma.pricingRule.create.mockResolvedValue({ id: 101, ...dto, active: true });

      const created = await service.createRule(dto as any);
      expect(created.id).toBe(101);
      expect(mockPrisma.pricingRule.create).toHaveBeenCalledTimes(1);
    });

    it('debe desactivar la regla en lugar de borrarla si tiene viajes asociados (TripFare)', async () => {
      mockPrisma.pricingRule.findUnique.mockResolvedValue({ id: 5, name: 'Tarifa Antigua' });
      mockPrisma.tripFare.count.mockResolvedValue(12); // tiene 12 viajes históricos
      mockPrisma.pricingRule.update.mockResolvedValue({ id: 5, active: false });

      await service.deleteRule(5);

      expect(mockPrisma.pricingRule.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { active: false },
      });
      expect(mockPrisma.pricingRule.delete).not.toHaveBeenCalled();
    });

    it('debe eliminar la regla físicamente si no tiene viajes asociados', async () => {
      mockPrisma.pricingRule.findUnique.mockResolvedValue({ id: 6, name: 'Tarifa Borrador' });
      mockPrisma.tripFare.count.mockResolvedValue(0);
      mockPrisma.pricingRule.delete.mockResolvedValue({ id: 6 });

      await service.deleteRule(6);

      expect(mockPrisma.pricingRule.delete).toHaveBeenCalledWith({
        where: { id: 6 },
      });
    });
  });

  describe('CRUD de Geofences', () => {
    it('debe registrar una nueva geocerca perimetral', async () => {
      const dto = {
        companyId: 1,
        name: 'Aeropuerto El Alto',
        surcharge: 15,
        areaGeoJson: '{"type":"Polygon","coordinates":[]}',
      };

      mockPrisma.geofence.create.mockResolvedValue({ id: 201, ...dto });

      const created = await service.createGeofence(dto as any);
      expect(created.id).toBe(201);
      expect(mockPrisma.geofence.create).toHaveBeenCalledTimes(1);
    });

    it('debe eliminar una geocerca existente', async () => {
      mockPrisma.geofence.findUnique.mockResolvedValue({ id: 201 });
      mockPrisma.geofence.delete.mockResolvedValue({ id: 201 });

      await service.deleteGeofence(201);
      expect(mockPrisma.geofence.delete).toHaveBeenCalledWith({ where: { id: 201 } });
    });
  });

  describe('calculateFare', () => {
    it('debe calcular la tarifa correctamente con base + km + tiempo + multiplicador', async () => {
      mockPrisma.pricingRule.findUnique.mockResolvedValue({
        id: 1,
        companyId: 10,
        baseFare: 10,
        kmRate: 2.5,
        minuteRate: 0.5,
        minFare: 15,
        tollSurcharge: 0,
        peakMultiplier: 1.2,
      });

      mockPrisma.geofence.findMany.mockResolvedValue([]);

      const result = await service.calculateFare({
        ruleId: 1,
        distanceKm: 4, // 4 * 2.5 = 10
        durationMinutes: 10, // 10 * 0.5 = 5
      });

      // Subtotal = 10 (base) + 10 (dist) + 5 (tiempo) = 25
      // Con peakMultiplier 1.2 -> 25 * 1.2 = 30.00
      expect(result.baseFare).toBe(10);
      expect(result.distanceCost).toBe(10);
      expect(result.timeCost).toBe(5);
      expect(result.total).toBe(30);
    });

    it('debe respetar minFare si el subtotal es menor al mínimo', async () => {
      mockPrisma.pricingRule.findUnique.mockResolvedValue({
        id: 1,
        companyId: 10,
        baseFare: 5,
        kmRate: 1,
        minuteRate: 0.1,
        minFare: 15,
        tollSurcharge: 0,
        peakMultiplier: 1.0,
      });

      mockPrisma.geofence.findMany.mockResolvedValue([]);

      const result = await service.calculateFare({
        ruleId: 1,
        distanceKm: 1,
        durationMinutes: 2,
      });

      // Subtotal = 5 + 1 + 0.2 = 6.2 < minFare 15 -> 15.00
      expect(result.total).toBe(15);
    });

    it('debe lanzar NotFoundException si la regla de precio no existe', async () => {
      mockPrisma.pricingRule.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateFare({
          ruleId: 999,
          distanceKm: 5,
          durationMinutes: 10,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('debe aplicar peakMultiplier en horario pico y omitirlo en horario valle (Fase 6.4)', async () => {
      mockPrisma.pricingRule.findUnique.mockResolvedValue({
        id: 1,
        companyId: 10,
        baseFare: 10,
        kmRate: 2,
        minuteRate: 0,
        minFare: 10,
        peakMultiplier: 1.5,
      });
      mockPrisma.geofence.findMany.mockResolvedValue([]);

      // 1. Horario pico laboral (Martes 08:30 AM local)
      // Base 10 + 5km * 2 = 20 -> Con 1.5 = 30.00
      const peakTuesday = new Date(2026, 8, 15, 8, 30, 0); // Martes 08:30
      const peakResult = await service.calculateFare({
        ruleId: 1,
        distanceKm: 5,
        durationMinutes: 10,
        scheduledAt: peakTuesday.toISOString(),
      });
      expect(peakResult.isPeakHour).toBe(true);
      expect(peakResult.peakMultiplier).toBe(1.5);
      expect(peakResult.total).toBe(30);

      // 2. Horario valle laboral (Martes 14:00 PM local)
      // Base 10 + 5km * 2 = 20 -> Con 1.0 = 20.00
      const offPeakTuesday = new Date(2026, 8, 15, 14, 0, 0); // Martes 14:00
      const offPeakResult = await service.calculateFare({
        ruleId: 1,
        distanceKm: 5,
        durationMinutes: 10,
        scheduledAt: offPeakTuesday.toISOString(),
      });
      expect(offPeakResult.isPeakHour).toBe(false);
      expect(offPeakResult.peakMultiplier).toBe(1.0);
      expect(offPeakResult.total).toBe(20);
    });
  });
});
