import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCallEventDto } from './dto/create-call-event.dto';
import { CreateTripFromCallDto } from './dto/create-trip-from-call.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra eventos del ciclo de vida de una llamada (RINGING, ANSWERED, ENDED)
   * desde Asterisk ARI/AMI o el conector telephony.
   */
  async registerCallEvent(dto: CreateCallEventDto) {
    const companyId = dto.companyId || 1;

    // 1. Obtener o crear el perfil del llamante (CallerProfile)
    let profile = await this.prisma.callerProfile.findUnique({
      where: {
        companyId_phoneNumber: {
          companyId,
          phoneNumber: dto.fromNumber,
        },
      },
      include: {
        customer: true,
      },
    });

    if (!profile) {
      // Buscar si ya existe un usuario registrado con este teléfono
      const existingUser = await this.prisma.user.findFirst({
        where: { phone: dto.fromNumber },
      });

      profile = await this.prisma.callerProfile.create({
        data: {
          companyId,
          phoneNumber: dto.fromNumber,
          customerId: existingUser?.id || null,
          frequentCustomer: false,
          historyNotes: dto.callerId ? `CallerID: ${dto.callerId}` : 'Contacto inicial',
        },
        include: {
          customer: true,
        },
      });
    }

    // 2. Gestionar el registro de la llamada según el evento
    let callRecord;

    if (dto.eventType === 'RINGING') {
      callRecord = await this.prisma.callRecord.upsert({
        where: { callUuid: dto.callUuid },
        update: {
          fromNumber: dto.fromNumber,
          toNumber: dto.toNumber,
          callerId: dto.callerId,
          customerId: profile.customerId,
          companyId,
        },
        create: {
          callUuid: dto.callUuid,
          fromNumber: dto.fromNumber,
          toNumber: dto.toNumber,
          callerId: dto.callerId,
          customerId: profile.customerId,
          companyId,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        },
      });
    } else if (dto.eventType === 'ANSWERED') {
      callRecord = await this.prisma.callRecord.upsert({
        where: { callUuid: dto.callUuid },
        update: {
          startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        },
        create: {
          callUuid: dto.callUuid,
          fromNumber: dto.fromNumber,
          toNumber: dto.toNumber,
          callerId: dto.callerId,
          customerId: profile.customerId,
          companyId,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        },
      });
    } else {
      // ENDED
      const endedDate = dto.endedAt ? new Date(dto.endedAt) : new Date();
      callRecord = await this.prisma.callRecord.upsert({
        where: { callUuid: dto.callUuid },
        update: {
          endedAt: endedDate,
          durationSeconds: dto.durationSeconds ?? undefined,
          recordingUrl: dto.recordingUrl ?? undefined,
        },
        create: {
          callUuid: dto.callUuid,
          fromNumber: dto.fromNumber,
          toNumber: dto.toNumber,
          callerId: dto.callerId,
          customerId: profile.customerId,
          companyId,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
          endedAt: endedDate,
          durationSeconds: dto.durationSeconds ?? undefined,
          recordingUrl: dto.recordingUrl ?? undefined,
        },
      });

      // Evaluar frecuencia del cliente
      const callsCount = await this.prisma.callRecord.count({
        where: { fromNumber: dto.fromNumber, companyId },
      });
      if (callsCount >= 3 && !profile.frequentCustomer) {
        await this.prisma.callerProfile.update({
          where: { id: profile.id },
          data: { frequentCustomer: true },
        });
      }
    }

    return { callRecord, profile };
  }

  /**
   * Obtiene el perfil enriquecido del llamante:
   * nombre, total de viajes realizados y direcciones frecuentes de recogida.
   */
  async getCallerProfile(companyId: number, phoneNumber: string) {
    let profile = await this.prisma.callerProfile.findUnique({
      where: {
        companyId_phoneNumber: {
          companyId,
          phoneNumber,
        },
      },
      include: {
        customer: true,
      },
    });

    if (!profile) {
      const user = await this.prisma.user.findFirst({
        where: { phone: phoneNumber },
      });

      profile = await this.prisma.callerProfile.create({
        data: {
          companyId,
          phoneNumber,
          customerId: user?.id || null,
          frequentCustomer: false,
        },
        include: {
          customer: true,
        },
      });
    }

    // Consultar viajes anteriores para extraer historial de direcciones frecuentes
    let pastRequests: any[] = [];
    if (profile.customerId) {
      pastRequests = await this.prisma.tripRequest.findMany({
        where: { customerId: profile.customerId },
        orderBy: { requestedAt: 'desc' },
        take: 20,
      });
    }

    // Extraer direcciones de origen únicas y recurrentes
    const addressCounts: Record<string, number> = {};
    pastRequests.forEach((req) => {
      if (req.originAddress) {
        addressCounts[req.originAddress] = (addressCounts[req.originAddress] || 0) + 1;
      }
    });

    const frequentAddresses = Object.entries(addressCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([address]) => address)
      .slice(0, 5);

    return {
      ...profile,
      totalTripsCount: pastRequests.length,
      frequentAddresses,
      displayName: profile.customer?.name || `Cliente (${phoneNumber})`,
    };
  }

  /**
   * Despacho en 1-Clic desde llamada telefónica:
   * Convierte la llamada en un TripRequest en estado PENDING y la vincula al CallRecord.
   */
  async createTripFromCall(callUuid: string, dto: CreateTripFromCallDto, _dispatcherId?: number) {
    const callRecord = await this.prisma.callRecord.findUnique({
      where: { callUuid },
    });

    if (!callRecord) {
      throw new NotFoundException(`Llamada con UUID ${callUuid} no encontrada`);
    }

    const companyId = dto.companyId || callRecord.companyId || 1;
    const phone = callRecord.fromNumber || '+59100000000';

    // Asegurar usuario cliente para el registro de viaje
    let customer = await this.prisma.user.findFirst({
      where: { phone },
    });

    if (!customer) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const defaultEmail = `phone_${cleanPhone}@radiotaxi.bo`;
      const hashedPassword = await bcrypt.hash('clientepass123', 10);

      customer = await this.prisma.user.create({
        data: {
          email: defaultEmail,
          password: hashedPassword,
          name: dto.customerName || `Cliente ${phone}`,
          phone,
          role: 'USER',
          companyId,
        },
      });

      // Vincular con CallerProfile
      await this.prisma.callerProfile.updateMany({
        where: { companyId, phoneNumber: phone },
        data: { customerId: customer.id },
      });
    }

    // Crear el TripRequest
    const tripRequest = await this.prisma.tripRequest.create({
      data: {
        customerId: customer.id,
        companyId,
        originAddress: dto.originAddress,
        originLat: dto.originLat,
        originLng: dto.originLng,
        destinationAddress: dto.destinationAddress,
        destinationLat: dto.destinationLat,
        destinationLng: dto.destinationLng,
        status: 'PENDING',
      },
    });

    // Vincular viaje con el registro de llamada
    const updatedCall = await this.prisma.callRecord.update({
      where: { id: callRecord.id },
      data: {
        tripId: tripRequest.id,
        customerId: customer.id,
      },
    });

    return {
      tripRequest,
      callRecord: updatedCall,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },
    };
  }

  /**
   * Obtiene el historial de llamadas telefónicas registradas.
   */
  async getCallHistory(companyId = 1, limit = 50, offset = 0) {
    const [calls, total] = await Promise.all([
      this.prisma.callRecord.findMany({
        where: {
          OR: [{ companyId }, { companyId: null }],
        },
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.callRecord.count({
        where: {
          OR: [{ companyId }, { companyId: null }],
        },
      }),
    ]);

    return {
      calls,
      total,
      limit,
      offset,
    };
  }
}
