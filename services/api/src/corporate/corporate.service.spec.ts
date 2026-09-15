import { Test, TestingModule } from '@nestjs/testing';
import { CorporateService } from './corporate.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CorporateService (SDD B2B Platform)', () => {
  let service: CorporateService;

  const mockPrisma: any = {
    corporateAccount: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    costCenter: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    corporateReservation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    tripRequest: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CorporateService>(CorporateService);
    jest.clearAllMocks();
  });

  describe('CorporateAccount', () => {
    it('debe registrar una nueva empresa cliente corporativa B2B', async () => {
      const dto = {
        companyId: 1,
        clientCompanyName: 'Banco Fassil en Liquidación',
        creditLimit: 15000,
        contactName: 'Lic. Javier Torrez',
        contactEmail: 'jtorrez@banco.com.bo',
      };

      mockPrisma.corporateAccount.create.mockResolvedValue({ id: 10, ...dto });

      const result = await service.createAccount(dto as any);
      expect(result.id).toBe(10);
      expect(mockPrisma.corporateAccount.create).toHaveBeenCalledTimes(1);
    });

    it('debe calcular correctamente el consumo y el crédito disponible en findAllAccounts', async () => {
      mockPrisma.corporateAccount.findMany.mockResolvedValue([
        {
          id: 1,
          clientCompanyName: 'Minera San Cristóbal S.A.',
          creditLimit: 5000,
          costCenters: [],
          corporateReservations: [
            { estimatedCost: 200, tripRequest: { trip: { fareTotal: 250 } } },
            { estimatedCost: 150, tripRequest: { trip: { fareTotal: 150 } } },
          ],
        },
      ]);

      const accounts = await service.findAllAccounts();
      expect(accounts[0].totalSpent).toBe(400);
      expect(accounts[0].availableCredit).toBe(4600);
    });
  });

  describe('CostCenter', () => {
    it('debe registrar un centro de costo para una empresa', async () => {
      const dto = {
        companyId: 1,
        code: 'CC-OPERACIONES',
        name: 'Operaciones de Campo',
      };

      mockPrisma.costCenter.create.mockResolvedValue({ id: 5, ...dto });

      const created = await service.createCostCenter(dto as any);
      expect(created.id).toBe(5);
    });
  });

  describe('CorporateReservation', () => {
    it('debe crear una reserva vinculada y un TripRequest programado atómicamente', async () => {
      mockPrisma.corporateAccount.findUnique.mockResolvedValue({
        id: 1,
        companyId: 1,
        creditLimit: 1000,
        costCenters: [],
        corporateReservations: [{ estimatedCost: 100 }],
      });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          tripRequest: {
            create: jest.fn().mockResolvedValue({ id: 99 }),
          },
          corporateReservation: {
            create: jest.fn().mockResolvedValue({
              id: 1,
              corporateAccountId: 1,
              tripRequestId: 99,
              reservationStatus: 'confirmed',
              estimatedCost: 80,
            }),
          },
        };
        return callback(tx);
      });

      const reservation = await service.createReservation({
        corporateAccountId: 1,
        customerId: 10,
        scheduledAt: '2026-09-17T10:00:00Z',
        originAddress: 'Hotel Europa, La Paz',
        destinationAddress: 'Aeropuerto El Alto',
        estimatedCost: 80,
      });

      expect(reservation.id).toBe(1);
      expect(reservation.reservationStatus).toBe('confirmed');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('debe rechazar la reserva si el costo estimado supera el crédito disponible', async () => {
      mockPrisma.corporateAccount.findUnique.mockResolvedValue({
        id: 1,
        companyId: 1,
        creditLimit: 100,
        costCenters: [],
        corporateReservations: [{ estimatedCost: 90 }], // Disponible: 10
      });

      await expect(
        service.createReservation({
          corporateAccountId: 1,
          customerId: 10,
          scheduledAt: '2026-09-17T10:00:00Z',
          originAddress: 'Calle 21 de Calacoto',
          destinationAddress: 'Centro',
          estimatedCost: 50, // 50 > 10
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
