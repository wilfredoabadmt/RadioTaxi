import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  private async getTripWithDetails(tripId: number) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        driver: {
          include: {
            user: true,
          },
        },
        vehicle: true,
        tripRequest: {
          include: {
            customer: true,
            company: true,
          },
        },
        fares: {
          include: {
            pricingRule: true,
          },
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Viaje #${tripId} no encontrado`);
    }

    return trip;
  }

  /**
   * Genera una intención de pago con cálculo exacto de la tarifa en BOB y payload para QR Simple / Tarjetas / Efectivo.
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    const trip = await this.getTripWithDetails(dto.tripId);

    // Determinar monto del viaje
    let amount = Number(trip.fareTotal || 0);
    if (amount <= 0 && trip.fares.length > 0) {
      amount = Number(trip.fares[0].totalFare || 0);
    }
    if (amount <= 0) {
      amount = 15.0; // Tarifa base mínima de seguridad
    }

    const companyName = trip.tripRequest.company?.name || 'RadioTaxi Bolivia S.R.L.';
    const companyNit = trip.tripRequest.company?.nit || '348921028';
    const gloss = `Carrera #${trip.id} - Movil ${trip.vehicle?.plate || 'Flota'}`;

    let paymentDetails: any = {
      method: dto.paymentMethod,
      currency: 'BOB',
      amount,
    };

    if (dto.paymentMethod === 'qr_bolivia') {
      // Estándar QR Simple interoperable para Bolivia (BCP, BNB, Banco Unión, PagoFácil)
      const expirationDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const qrPayload = `ST01|BOB|${amount.toFixed(2)}|NIT:${companyNit}|${companyName}|TRIP-${trip.id}|${Date.now()}`;

      paymentDetails = {
        ...paymentDetails,
        provider: 'QR_SIMPLE_BOLIVIA',
        beneficiary: companyName,
        nit: companyNit,
        gloss,
        expirationDate,
        qrPayload,
      };
    } else if (dto.paymentMethod === 'card') {
      paymentDetails = {
        ...paymentDetails,
        provider: 'GATEWAY_CARD_PROCESSING',
        checkoutUrl: `/checkout/card?tripId=${trip.id}&amount=${amount}`,
        transactionToken: `tok_live_${trip.id}_${Date.now()}`,
      };
    } else if (dto.paymentMethod === 'corporate_account') {
      paymentDetails = {
        ...paymentDetails,
        provider: 'B2B_CORPORATE_CREDIT',
        accountName: trip.tripRequest.company?.name || 'Cuenta Corporativa Registrada',
        status: 'AUTHORIZED',
      };
    } else {
      paymentDetails = {
        ...paymentDetails,
        provider: 'DIRECT_CASH',
        instructions: 'Efectuar pago en efectivo directamente al conductor al concluir el viaje.',
      };
    }

    return {
      tripId: trip.id,
      customer: {
        name: dto.customerName || trip.tripRequest.customer?.name || 'Cliente',
        nit: dto.customerNit || '0',
      },
      amount,
      currency: 'BOB',
      paymentDetails,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Confirma la liquidación de un viaje y actualiza su estado contable y de auditoría.
   */
  async confirmPayment(dto: ConfirmPaymentDto) {
    const trip = await this.getTripWithDetails(dto.tripId);

    const updatedTrip = await this.prisma.trip.update({
      where: { id: dto.tripId },
      data: {
        paymentMethod: dto.paymentMethod,
        fareTotal: dto.amount,
      },
    });

    // Registrar en auditoría la confirmación del cobro
    await this.prisma.auditLog.create({
      data: {
        companyId: trip.tripRequest.companyId,
        entityType: 'Trip',
        entityId: trip.id,
        action: 'PAYMENT_CONFIRMED',
        data: {
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          transactionReference: dto.transactionReference || 'MANUAL_CONFIRMATION',
          notes: dto.notes || 'Pago verificado exitosamente',
        },
      },
    });

    return {
      success: true,
      tripId: updatedTrip.id,
      status: 'PAID',
      amount: updatedTrip.fareTotal,
      currency: 'BOB',
      paymentMethod: updatedTrip.paymentMethod,
      transactionReference: dto.transactionReference || 'REF-OK',
      confirmedAt: new Date().toISOString(),
      receiptUrl: `/payments/receipt/${updatedTrip.id}`,
    };
  }

  /**
   * Consulta el estado de pago del viaje.
   */
  async getTripPaymentStatus(tripId: number) {
    const trip = await this.getTripWithDetails(tripId);
    return {
      tripId: trip.id,
      tripStatus: trip.status,
      isPaid: Boolean(trip.paymentMethod && trip.fareTotal > 0),
      paymentMethod: trip.paymentMethod || null,
      fareTotal: trip.fareTotal,
      currency: 'BOB',
    };
  }

  /**
   * Emite el comprobante electrónico / recibo digital oficial del viaje.
   */
  async getReceipt(tripId: number) {
    const trip = await this.getTripWithDetails(tripId);

    const latestFare = trip.fares[0];
    const distanceKm = trip.distanceMeters ? (trip.distanceMeters / 1000).toFixed(2) : '0.00';
    const durationMin = trip.durationSeconds ? Math.round(trip.durationSeconds / 60) : 0;

    // Número de recibo correlativo y código de autorización único
    const receiptNumber = `REC-2026-${String(trip.id).padStart(6, '0')}`;
    const authCode = Buffer.from(`RT-BOL-${trip.id}-${trip.fareTotal}-${trip.startedAt.getTime()}`)
      .toString('base64')
      .substring(0, 16)
      .toUpperCase();

    return {
      receiptNumber,
      authorizationCode: authCode,
      issuedAt: trip.endedAt || new Date(),
      status: trip.paymentMethod ? 'PAID' : 'PENDING',
      paymentMethod: trip.paymentMethod || 'cash',
      currency: 'BOB',
      company: {
        name: trip.tripRequest.company?.name || 'RadioTaxi Bolivia S.R.L.',
        nit: trip.tripRequest.company?.nit || '348921028',
        address: trip.tripRequest.company?.address || 'Av. Mariscal Santa Cruz, La Paz - Bolivia',
      },
      passenger: {
        name: trip.tripRequest.customer?.name || 'Pasajero General',
        phone: trip.tripRequest.customer?.phone || 'Sin número',
        email: trip.tripRequest.customer?.email || 'N/A',
      },
      driver: {
        name: trip.driver?.user?.name || 'Conductor Asignado',
        license: trip.driver?.licenseNumber || 'Cat. Profesional',
      },
      vehicle: {
        plate: trip.vehicle?.plate || 'Sin Placa',
        brand: trip.vehicle?.brand || 'Toyota',
        model: trip.vehicle?.model || 'Corolla',
        color: trip.vehicle?.color || 'Blanco',
      },
      route: {
        origin: trip.tripRequest.originAddress || 'Origen GPS',
        destination: trip.tripRequest.destinationAddress || 'Destino de Viaje',
        distanceKm: Number(distanceKm),
        durationMinutes: durationMin,
      },
      fareBreakdown: {
        baseFare: latestFare ? Number(latestFare.baseFare) : 5.0,
        distanceFare: Number((Number(distanceKm) * 3.0).toFixed(2)),
        timeFare: Number((durationMin * 0.5).toFixed(2)),
        totalFare: Number(trip.fareTotal || (latestFare ? latestFare.totalFare : 15.0)),
      },
      legalNotice:
        'Comprobante digital para liquidación de servicios de radiotaxi y transporte corporativo conforme a normativas del SIN Bolivia.',
    };
  }

  /**
   * Procesa webhooks de pasarelas bancarias y pasarelas de pago.
   */
  async handleWebhook(dto: PaymentWebhookDto) {
    if (dto.status !== 'SUCCESS') {
      return { received: true, action: 'IGNORED_STATUS' };
    }

    const trip = await this.prisma.trip.findUnique({ where: { id: dto.tripId } });
    if (!trip) {
      throw new NotFoundException(`Viaje #${dto.tripId} no existe`);
    }

    await this.confirmPayment({
      tripId: dto.tripId,
      amount: dto.amount,
      paymentMethod: dto.provider.includes('qr') ? 'qr_bolivia' : 'card',
      transactionReference: dto.transactionId,
      notes: `Confirmación automática vía webhook proveedor: ${dto.provider}`,
    });

    return {
      received: true,
      action: 'PAYMENT_SETTLED',
      tripId: dto.tripId,
      transactionId: dto.transactionId,
    };
  }
}
