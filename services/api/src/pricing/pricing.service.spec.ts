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
    },
    geofence: {
      findMany: jest.fn(),
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
  });
});
