import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, TokensResponseDto } from './dto/auth.dto';
import { RegisterDto, RegisterPrescriberDto } from '../users/dto/users.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { plainToInstance } from 'class-transformer';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    const tokens = await this.authService.registerCustomer(dto);
    return plainToInstance(TokensResponseDto, tokens, { excludeExtraneousValues: true });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register/prescriber')
  async registerPrescriber(
    @Body() dto: RegisterPrescriberDto,
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    const userAgent = req.headers['user-agent'];
    const tokens = await this.authService.registerPrescriber(dto, ip, userAgent);
    return plainToInstance(TokensResponseDto, tokens, { excludeExtraneousValues: true });
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const userAgent = req.headers['user-agent'];
    const { user, tokens } = await this.authService.login(dto.email, dto.password, ip, userAgent);
    return {
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
      ...plainToInstance(TokensResponseDto, tokens, { excludeExtraneousValues: true }),
    };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() payload: { user: User; tokenRecord: RefreshToken },
    @Ip() ip: string,
    @Req() req: Request,
  ): Promise<TokensResponseDto> {
    const userAgent = req.headers['user-agent'];
    const tokens = await this.authService.refresh(payload.user, payload.tokenRecord, ip, userAgent);
    return plainToInstance(TokensResponseDto, tokens, { excludeExtraneousValues: true });
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.authService.logout(dto.refreshToken, userId);
  }

  @Post('logout/all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser('id') userId: string): Promise<void> {
    await this.authService.logoutAll(userId);
  }
}
