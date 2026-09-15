import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let prisma: any;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    driver: { count: jest.fn() },
    trip: { count: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return UP when database query succeeds', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await service.checkHealth();

      expect(result.status).toBe('UP');
      expect(result.database.status).toBe('UP');
      expect(result.system.nodeVersion).toBeDefined();
      expect(result.services.realtime.status).toBe('CONFIGURED');
    });

    it('should return DEGRADED when database query fails', async () => {
      prisma.$queryRaw.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.checkHealth();

      expect(result.status).toBe('DEGRADED');
      expect(result.database.status).toBe('DOWN');
    });
  });

  describe('getPrometheusMetrics', () => {
    it('should format metrics in standard Prometheus plain text', async () => {
      prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      prisma.driver.count.mockResolvedValue(12);
      prisma.trip.count
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(150); // completed

      const metrics = await service.getPrometheusMetrics();

      expect(metrics).toContain('radiotaxi_uptime_seconds');
      expect(metrics).toContain('radiotaxi_db_connected 1');
      expect(metrics).toContain('radiotaxi_active_drivers_total 12');
      expect(metrics).toContain('radiotaxi_active_trips_total 5');
      expect(metrics).toContain('radiotaxi_completed_trips_total 150');
    });
  });
});
