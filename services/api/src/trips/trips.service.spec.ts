import { Test, TestingModule } from '@nestjs/testing';
import { TripsService } from './trips.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('TripsService (SDD State Machine Contract)', () => {
  let service: TripsService;
  let prisma: PrismaService;

  const mockPrisma: any = {
    trip: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    tripRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    vehicle: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    driver: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : typeof arg === 'function' ? arg(mockPrisma) : Promise.resolve(arg)
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TripsService>(TripsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('markArrived (ASSIGNED -> ARRIVED)', () => {
    it('debe permitir la transición cuando el estado es ASSIGNED', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ id: 1, status: 'ASSIGNED' });
      mockPrisma.trip.update.mockResolvedValue({ id: 1, status: 'ARRIVED' });

      const result = await service.markArrived(1);
      expect(result.status).toBe('ARRIVED');
      expect(mockPrisma.trip.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'ARRIVED' },
      });
    });

    it('debe lanzar ConflictException si el viaje ya está IN_PROGRESS', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ id: 1, status: 'IN_PROGRESS' });

      await expect(service.markArrived(1)).rejects.toThrow(ConflictException);
    });

    it('debe lanzar NotFoundException si el viaje no existe', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      await expect(service.markArrived(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('start (ARRIVED -> IN_PROGRESS)', () => {
    it('debe iniciar el viaje si el estado previo es ARRIVED o ASSIGNED', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({ id: 1, status: 'ARRIVED' });
      mockPrisma.trip.update.mockResolvedValue({ id: 1, status: 'IN_PROGRESS' });

      const result = await service.start(1);
      expect(result.status).toBe('IN_PROGRESS');
      expect(mockPrisma.trip.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'IN_PROGRESS',
          startedAt: expect.any(Date),
        },
      });
    });
  });

  describe('complete (IN_PROGRESS -> COMPLETED)', () => {
    it('debe completar el viaje y liberar vehículo y conductor en transacción', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        id: 1,
        status: 'IN_PROGRESS',
        tripRequestId: 10,
        vehicleId: 5,
        driverId: 8,
      });

      mockPrisma.trip.update.mockResolvedValue({ id: 1, status: 'COMPLETED' });
      mockPrisma.tripRequest.update.mockResolvedValue({ id: 10, status: 'COMPLETED' });
      mockPrisma.driver.update.mockResolvedValue({ id: 8, status: 'available' });
      mockPrisma.vehicle.update.mockResolvedValue({ id: 5, status: 'available' });

      const result = await service.complete(1);
      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.vehicle.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { status: 'available' },
      });
      expect(mockPrisma.driver.update).toHaveBeenCalledWith({
        where: { id: 8 },
        data: { status: 'available' },
      });
    });
  });
});
