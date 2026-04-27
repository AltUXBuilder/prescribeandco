import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentResponseDto, PaymentWebhookDto, RefundPaymentDto } from './dto/payments.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * GET /payments/:id
   * ADMIN — view any payment record.
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentsService.findById(id);
    return this.paymentsService.toResponseDto(payment);
  }

  /**
   * GET /payments/prescription/:prescriptionId
   * ADMIN — fetch the payment for a specific prescription.
   */
  @Get('prescription/:prescriptionId')
  @Roles(Role.ADMIN)
  async findByPrescription(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
  ): Promise<PaymentResponseDto | null> {
    const payment = await this.paymentsService.findByPrescription(prescriptionId);
    return payment ? this.paymentsService.toResponseDto(payment) : null;
  }

  /**
   * POST /payments/:id/refund
   * ADMIN only — issue a full or partial refund after capture.
   */
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
   * Public (no JWT) — inbound from the payment provider.
   * In production this route must additionally verify a provider-signed secret header.
   * @Public() bypasses JwtAuthGuard; route-level IP allowlisting should be applied
   * in the infrastructure layer (nginx / API gateway).
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() dto: PaymentWebhookDto): Promise<void> {
    await this.paymentsService.handleWebhook(dto);
  }
}
