import { Test, TestingModule } from '@nestjs/testing';
import { CallsService } from './calls.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('CallsService', () => {
  let service: CallsService;
  let prisma: any;

  const mockPrismaService = {
    callerProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    callRecord: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    tripRequest: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CallsService>(CallsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('registerCallEvent', () => {
    it('should register a RINGING call event and upsert CallRecord and CallerProfile', async () => {
      const mockProfile = { id: 10, companyId: 1, phoneNumber: '+59170112233', customerId: null };
      prisma.callerProfile.findUnique.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.callerProfile.create.mockResolvedValue(mockProfile);

      const mockCall = {
        id: 1,
        callUuid: 'call-uuid-123',
        fromNumber: '+59170112233',
        companyId: 1,
      };
      prisma.callRecord.upsert.mockResolvedValue(mockCall);

      const result = await service.registerCallEvent({
        callUuid: 'call-uuid-123',
        fromNumber: '+59170112233',
        eventType: 'RINGING',
        callerId: 'Juan Choque',
      });

      expect(prisma.callerProfile.create).toHaveBeenCalled();
      expect(prisma.callRecord.upsert).toHaveBeenCalled();
      expect(result.callRecord.callUuid).toBe('call-uuid-123');
    });

    it('should update call record on ENDED event and mark customer as frequent if count >= 3', async () => {
      const mockProfile = { id: 10, companyId: 1, phoneNumber: '+59170112233', frequentCustomer: false };
      prisma.callerProfile.findUnique.mockResolvedValue(mockProfile);
      prisma.callRecord.upsert.mockResolvedValue({ id: 1, callUuid: 'call-uuid-123', durationSeconds: 65 });
      prisma.callRecord.count.mockResolvedValue(4);
      prisma.callerProfile.update.mockResolvedValue({ ...mockProfile, frequentCustomer: true });

      const result = await service.registerCallEvent({
        callUuid: 'call-uuid-123',
        fromNumber: '+59170112233',
        eventType: 'ENDED',
        durationSeconds: 65,
        recordingUrl: 'https://storage.radiotaxi.bo/rec/123.wav',
      });

      expect(prisma.callRecord.upsert).toHaveBeenCalled();
      expect(prisma.callerProfile.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { frequentCustomer: true },
      });
      expect(result.profile.id).toBe(10);
    });
  });

  describe('getCallerProfile', () => {
    it('should return enriched profile with past trip count and frequent pickup addresses', async () => {
      const mockProfile = {
        id: 5,
        companyId: 1,
        phoneNumber: '+59170099887',
        customerId: 25,
        customer: { id: 25, name: 'Elena Ramos', phone: '+59170099887' },
      };
      prisma.callerProfile.findUnique.mockResolvedValue(mockProfile);
      prisma.tripRequest.findMany.mockResolvedValue([
        { originAddress: 'Plaza Murillo, Centro' },
        { originAddress: 'Plaza Murillo, Centro' },
        { originAddress: 'Av. 6 de Agosto, Sopocachi' },
      ]);

      const result = await service.getCallerProfile(1, '+59170099887');

      expect(result.displayName).toBe('Elena Ramos');
      expect(result.totalTripsCount).toBe(3);
      expect(result.frequentAddresses).toContain('Plaza Murillo, Centro');
      expect(result.frequentAddresses[0]).toBe('Plaza Murillo, Centro');
    });
  });

  describe('createTripFromCall', () => {
    it('should throw NotFoundException if call is not found', async () => {
      prisma.callRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.createTripFromCall('non-existent', { originAddress: 'Av. Busch' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a TripRequest linked to the CallRecord in 1-click', async () => {
      const mockCall = {
        id: 42,
        callUuid: 'call-live-999',
        fromNumber: '+59178888888',
        companyId: 1,
      };
      prisma.callRecord.findUnique.mockResolvedValue(mockCall);
      prisma.user.findFirst.mockResolvedValue({ id: 80, name: 'Pedro Morales', phone: '+59178888888' });

      const mockTripRequest = {
        id: 101,
        customerId: 80,
        companyId: 1,
        originAddress: 'Calle 21 de Calacoto',
        status: 'PENDING',
      };
      prisma.tripRequest.create.mockResolvedValue(mockTripRequest);
      prisma.callRecord.update.mockResolvedValue({ ...mockCall, tripId: 101, customerId: 80 });

      const result = await service.createTripFromCall('call-live-999', {
        originAddress: 'Calle 21 de Calacoto',
        destinationAddress: 'Aeropuerto El Alto',
      });

      expect(prisma.tripRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: 80,
          originAddress: 'Calle 21 de Calacoto',
          destinationAddress: 'Aeropuerto El Alto',
          status: 'PENDING',
        }),
      });
      expect(prisma.callRecord.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { tripId: 101, customerId: 80 },
      });
      expect(result.tripRequest.id).toBe(101);
      expect(result.callRecord.tripId).toBe(101);
    });
  });

  describe('getCallHistory', () => {
    it('should list call records with customer relations and pagination', async () => {
      const mockCalls = [
        { id: 1, callUuid: 'uuid-1', fromNumber: '+59170000001' },
        { id: 2, callUuid: 'uuid-2', fromNumber: '+59170000002' },
      ];
      prisma.callRecord.findMany.mockResolvedValue(mockCalls);
      prisma.callRecord.count.mockResolvedValue(2);

      const result = await service.getCallHistory(1, 10, 0);

      expect(result.calls.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(10);
    });
  });
});
