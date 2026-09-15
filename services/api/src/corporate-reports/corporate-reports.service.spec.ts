import { Test, TestingModule } from '@nestjs/testing';
import { CorporateReportsService } from './corporate-reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CorporateReportsService (Excel Generation)', () => {
  let service: CorporateReportsService;

  const mockPrisma: any = {
    company: {
      findUnique: jest.fn(),
    },
    trip: {
      findMany: jest.fn(),
    },
    corporateReport: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorporateReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CorporateReportsService>(CorporateReportsService);
    jest.clearAllMocks();
  });

  it('debe generar reporte consolidado con libro Excel binario XLSX', async () => {
    mockPrisma.company.findUnique.mockResolvedValue({
      id: 1,
      name: 'RadioTaxi Central La Paz',
      nit: '10928374',
    });

    mockPrisma.trip.findMany.mockResolvedValue([
      {
        id: 1,
        status: 'COMPLETED',
        fareTotal: 45.0,
        distanceMeters: 8000,
        startedAt: new Date('2026-09-10T08:00:00Z'),
        driver: { user: { name: 'Pedro Gomez' } },
        vehicle: { plate: '3341-NMB' },
        tripRequest: { customer: { name: 'Carlos Morales' }, originAddress: 'Miraflores', destinationAddress: 'Calacoto' },
      },
    ]);

    mockPrisma.corporateReport.create.mockImplementation((args: any) => ({
      id: 1,
      ...args.data,
    }));

    const report = await service.generateReport(1, 'Reporte Semanal');

    expect(report.id).toBe(1);
    expect(report.reportType).toBe('CONSOLIDATED_EXCEL');
    expect(report.data.totalTrips).toBe(1);
    expect(report.data.totalRevenue).toBe(45.0);
    expect(report.data.excelBase64).toBeDefined();
    expect(typeof report.data.excelBase64).toBe('string');
  });
});
