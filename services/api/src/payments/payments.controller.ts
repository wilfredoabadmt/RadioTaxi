import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { Public } from '../auth/public.decorator';

@ApiTags('payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  @Roles('USER', 'DRIVER', 'DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Generar intención de pago (QR Simple Bolivia, Tarjeta o Efectivo)' })
  @ApiResponse({ status: 201, description: 'Intención generada con payload para pago' })
  createIntent(@Body() dto: CreatePaymentIntentDto) {
    return this.paymentsService.createPaymentIntent(dto);
  }

  @Post('confirm')
  @Roles('DRIVER', 'DISPATCHER', 'ADMIN')
  @Audit('CONFIRM', 'Payment')
  @ApiOperation({ summary: 'Confirmar liquidación exitosa de pago de un viaje' })
  @ApiResponse({ status: 200, description: 'Pago confirmado y registrado' })
  confirm(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(dto);
  }

  @Get('receipt/:tripId')
  @Roles('USER', 'DRIVER', 'DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Obtener comprobante / recibo digital estructurado del viaje' })
  @ApiParam({ name: 'tripId', description: 'ID del viaje' })
  @ApiResponse({ status: 200, description: 'Comprobante digital del viaje' })
  getReceipt(@Param('tripId', ParseIntPipe) tripId: number) {
    return this.paymentsService.getReceipt(tripId);
  }

  @Get('trip/:tripId')
  @Roles('USER', 'DRIVER', 'DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Consultar estado contable y de pago de un viaje' })
  @ApiParam({ name: 'tripId', description: 'ID del viaje' })
  @ApiResponse({ status: 200, description: 'Estado de pago' })
  getPaymentStatus(@Param('tripId', ParseIntPipe) tripId: number) {
    return this.paymentsService.getTripPaymentStatus(tripId);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Webhook para recepción de pagos asíncronos (QR Simple / Pasarelas)' })
  @ApiResponse({ status: 200, description: 'Notificación procesada' })
  handleWebhook(@Body() dto: PaymentWebhookDto) {
    return this.paymentsService.handleWebhook(dto);
  }
}
