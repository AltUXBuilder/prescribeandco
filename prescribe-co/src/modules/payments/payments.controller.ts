import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  RawBodyRequest,
  Req,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { PaymentsService } from './payments.service';
import { PaymentResponseDto, PaymentWebhookDto, RefundPaymentDto } from './dto/payments.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  @Get(':id')
  @Roles(Role.ADMIN)
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentsService.findById(id);
    return this.paymentsService.toResponseDto(payment);
  }

  @Get('prescription/:prescriptionId')
  @Roles(Role.ADMIN)
  async findByPrescription(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
  ): Promise<PaymentResponseDto | null> {
    const payment = await this.paymentsService.findByPrescription(prescriptionId);
    return payment ? this.paymentsService.toResponseDto(payment) : null;
  }

  @Post(':id/refund')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentsService.refund(id, dto);
    return this.paymentsService.toResponseDto(payment);
  }

  /**
   * POST /payments/webhook
   * Verifies the Stripe-Signature header using HMAC-SHA256 before processing.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Body() dto: PaymentWebhookDto,
  ): Promise<void> {
    const secret = this.config.get<string>('payments.stripeWebhookSecret');
    if (!secret) throw new BadRequestException('Webhook secret not configured');
    if (!signature) throw new UnauthorizedException('Missing Stripe-Signature header');
    this.verifyStripeSignature(req.rawBody!, signature, secret);
    await this.paymentsService.handleWebhook(dto);
  }

  private verifyStripeSignature(rawBody: Buffer, signature: string, secret: string): void {
    const parts = Object.fromEntries(signature.split(',').map((p) => p.split('=')));
    const timestamp = parts['t'];
    const v1 = parts['v1'];
    if (!timestamp || !v1) throw new UnauthorizedException('Invalid Stripe-Signature format');
    const tolerance = 5 * 60;
    if (Math.abs(Date.now() / 1000 - parseInt(timestamp, 10)) > tolerance) {
      throw new UnauthorizedException('Webhook timestamp too old');
    }
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(v1, 'hex');
    if (expectedBuf.length !== receivedBuf.length || !crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }
}
