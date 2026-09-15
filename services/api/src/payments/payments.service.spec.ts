import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PaymentsService (SDD Payment & Receipt Management)', () => {
  let service: PaymentsService;

  const mockTripData: any = {
    id: 42,
    fareTotal: 35.0,
    startedAt: new Date('2026-09-15T10:00:00Z'),
    endedAt: new Date('2026-09-15T10:25:00Z'),
    distanceMeters: 7500,
    durationSeconds: 1500,
    status: 'COMPLETED',
    paymentMethod: null,
    driver: {
      user: { name: 'Carlos Choque' },
      licenseNumber: 'LP-98214',
    },
    vehicle: {
      plate: '4021-XRT',
      brand: 'Toyota',
      model: 'Corolla',
      color: 'Plata',
    },
    tripRequest: {
      companyId: 1,
      originAddress: 'Plaza Murillo, La Paz',
      destinationAddress: 'San Miguel, Zona Sur',
      customer: {
        name: 'Elena Ramos',
        phone: '+591 71234567',
        email: 'elena@gmail.com',
      },
      company: {
        id: 1,
        name: 'RadioTaxi La Paz SRL',
        nit: '1029384756',
        address: 'Av. 16 de Julio #1490',
      },
    },
    fares: [
      {
        id: 1,
        baseFare: 5.0,
        totalFare: 35.0,
        pricingRule: { name: 'Tarifa Estándar' },
      },
    ],
  };

  const mockPrisma: any = {
    trip: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('debe generar intención con payload QR Simple interoperable para Bolivia', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTripData);

      const intent = await service.createPaymentIntent({
        tripId: 42,
        paymentMethod: 'qr_bolivia',
        customerNit: '5492101',
        customerName: 'Elena Ramos',
      });

      expect(intent.tripId).toBe(42);
      expect(intent.amount).toBe(35.0);
      expect(intent.currency).toBe('BOB');
      expect(intent.paymentDetails.provider).toBe('QR_SIMPLE_BOLIVIA');
      expect(intent.paymentDetails.nit).toBe('1029384756');
      expect(intent.paymentDetails.qrPayload).toContain('ST01|BOB|35.00');
    });

    it('debe lanzar NotFoundException si el viaje no existe', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent({
          tripId: 999,
          paymentMethod: 'cash',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmPayment', () => {
    it('debe registrar el pago exitoso y generar registro de auditoría', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTripData);
      mockPrisma.trip.update.mockResolvedValue({
        ...mockTripData,
        paymentMethod: 'qr_bolivia',
        fareTotal: 35.0,
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 10 });

      const result = await service.confirmPayment({
        tripId: 42,
        paymentMethod: 'qr_bolivia',
        amount: 35.0,
        transactionReference: 'BNB-QR-778899',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('PAID');
      expect(result.currency).toBe('BOB');
      expect(mockPrisma.trip.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { paymentMethod: 'qr_bolivia', fareTotal: 35.0 },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'PAYMENT_CONFIRMED',
          entityType: 'Trip',
          entityId: 42,
        }),
      });
    });
  });

  describe('getReceipt', () => {
    it('debe emitir comprobante digital estructurado con número correlativo y desglose', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue({
        ...mockTripData,
        paymentMethod: 'qr_bolivia',
      });

      const receipt = await service.getReceipt(42);

      expect(receipt.receiptNumber).toBe('REC-2026-000042');
      expect(receipt.status).toBe('PAID');
      expect(receipt.paymentMethod).toBe('qr_bolivia');
      expect(receipt.company.nit).toBe('1029384756');
      expect(receipt.driver.name).toBe('Carlos Choque');
      expect(receipt.vehicle.plate).toBe('4021-XRT');
      expect(receipt.route.distanceKm).toBe(7.5);
      expect(receipt.fareBreakdown.totalFare).toBe(35.0);
      expect(receipt.legalNotice).toBeDefined();
    });
  });

  describe('handleWebhook', () => {
    it('debe procesar webhook exitoso de pasarela y confirmar viaje automáticamente', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTripData);
      mockPrisma.trip.update.mockResolvedValue({
        ...mockTripData,
        paymentMethod: 'qr_bolivia',
        fareTotal: 35.0,
      });

      const response = await service.handleWebhook({
        provider: 'qr_simple',
        transactionId: 'TX-BNB-9921',
        tripId: 42,
        amount: 35.0,
        status: 'SUCCESS',
      });

      expect(response.received).toBe(true);
      expect(response.action).toBe('PAYMENT_SETTLED');
    });
  });

  describe('issueFiscalInvoice (Fase 7.7 - SIN Bolivia)', () => {
    it('debe emitir factura fiscal con Código de Control v7 y QR tributario SIN', async () => {
      mockPrisma.trip.findUnique.mockResolvedValue(mockTripData);
      mockPrisma.auditLog.create.mockResolvedValue({ id: 99 });

      const invoice = await service.issueFiscalInvoice({
        tripId: 42,
        clientNit: '1028372023',
        clientBusinessName: 'BANCO SOL S.A.',
        clientEmail: 'facturacion@bancosol.com.bo',
      });

      expect(invoice.invoiceNumber).toBe('1042');
      expect(invoice.authorizationNumber).toBe('29040011007');
      expect(invoice.controlCode).toBeDefined();
      expect(invoice.controlCode.split('-').length).toBeGreaterThanOrEqual(4);
      expect(invoice.financialBreakdown.total).toBe(35.0);
      expect(invoice.financialBreakdown.ivaTaxCredit).toBe(4.55); // 13% de 35.0
      expect(invoice.client.nit).toBe('1028372023');
      expect(invoice.client.businessName).toBe('BANCO SOL S.A.');
      expect(invoice.qrSinPayload).toContain('1029384756|1042|29040011007');
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('getFiscalInvoice', () => {
    it('debe recuperar factura fiscal previamente auditada', async () => {
      mockPrisma.auditLog.findFirst = jest.fn().mockResolvedValue({
        id: 99,
        action: 'FISCAL_INVOICE_ISSUED',
        data: {
          invoiceNumber: '1042',
          authorizationNumber: '29040011007',
          controlCode: 'A1-B2-C3-D4-E5',
          financialBreakdown: { total: 35.0 },
        },
      });

      const invoice: any = await service.getFiscalInvoice(42);
      expect(invoice.invoiceNumber).toBe('1042');
      expect(invoice.controlCode).toBe('A1-B2-C3-D4-E5');
    });

  });
});
