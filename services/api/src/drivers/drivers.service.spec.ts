import { Test, TestingModule } from '@nestjs/testing';
import { DriversService } from './drivers.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('DriversService (Documents & Bolivian Compliance TIC)', () => {
  let service: DriversService;

  const mockDriver = {
    id: 7,
    userId: 10,
    licenseNumber: 'LP-49210',
    user: { name: 'Juan Carlos Mamani' },
  };

  const mockPrisma: any = {
    driver: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    driverDocument: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    complianceRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
    jest.clearAllMocks();
  });

  describe('DriverDocument', () => {
    it('debe registrar un documento (SOAT/Licencia) para el conductor', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrisma.driverDocument.create.mockResolvedValue({
        id: 1,
        driverId: 7,
        documentType: 'SOAT',
        documentNumber: 'SOAT-2026-091',
        verified: false,
      });

      const doc = await service.addDocument(7, {
        documentType: 'SOAT',
        documentNumber: 'SOAT-2026-091',
      });

      expect(doc.id).toBe(1);
      expect(doc.verified).toBe(false);
      expect(mockPrisma.driverDocument.create).toHaveBeenCalled();
    });

    it('debe verificar un documento existente', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrisma.driverDocument.findFirst.mockResolvedValue({
        id: 1,
        driverId: 7,
        verified: false,
      });
      mockPrisma.driverDocument.update.mockResolvedValue({
        id: 1,
        verified: true,
      });

      const verified = await service.verifyDocument(7, 1);
      expect(verified.verified).toBe(true);
    });
  });

  describe('ComplianceRecord (Bolivia)', () => {
    it('debe registrar la Tarjeta de Identificación del Conductor (TIC)', async () => {
      mockPrisma.driver.findUnique.mockResolvedValue(mockDriver);
      mockPrisma.complianceRecord.create.mockResolvedValue({
        id: 1,
        driverId: 7,
        ticNumber: 'TIC-LP-2026-99',
        status: 'valid',
      });

      const comp = await service.addCompliance(7, {
        companyId: 1,
        ticNumber: 'TIC-LP-2026-99',
      });

      expect(comp.ticNumber).toBe('TIC-LP-2026-99');
      expect(comp.status).toBe('valid');
    });
  });
});
