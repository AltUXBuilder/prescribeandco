import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { UpdateUserRoleDto, UserResponseDto } from './dto/users.dto';
import { User } from './entities/user.entity';
import { plainToInstance } from 'class-transformer';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Self ───────────────────────────────────────────────────────────────────

  /**
   * GET /users/me
   * Any authenticated user — returns their own profile.
   */
  @Get('me')
  async getMe(@CurrentUser() user: User): Promise<UserResponseDto> {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * GET /users/me/profile
   * PRESCRIBER only — includes GPhC profile data.
   */
  @Get('me/profile')
  @Roles(Role.PRESCRIBER)
  async getMyPrescriberProfile(@CurrentUser('id') id: string) {
    return this.usersService.findById(id, true);
  }

  // ── Admin operations ───────────────────────────────────────────────────────

  /**
   * GET /users
   * ADMIN only — not implemented here (placeholder for UsersModule expansion).
   */
  @Get()
  @Roles(Role.ADMIN)
  async listUsers(): Promise<{ message: string }> {
    // Pagination / filtering will be added in the Users expansion module
    return { message: 'User list — implement with pagination' };
  }

  /**
   * GET /users/:id
   * ADMIN only.
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * PATCH /users/:id/role
   * ADMIN only — promote or change a user's role.
   */
  @Patch(':id/role')
  @Roles(Role.ADMIN)
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser('id') adminId: string,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.updateRole(id, dto.role, adminId);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * DELETE /users/:id
   * ADMIN only — soft-deactivate a user account.
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<void> {
    await this.usersService.deactivate(id, adminId);
  }
}
