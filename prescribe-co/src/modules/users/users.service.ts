import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { PrescriberProfile } from './entities/prescriber-profile.entity';
import { RegisterDto, RegisterPrescriberDto } from './dto/users.dto';
import { Role } from '../../common/enums/role.enum';
import { AuditHelper } from '../audit/audit.helper';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(PrescriberProfile)
    private readonly prescriberProfileRepo: Repository<PrescriberProfile>,

    private readonly auditHelper: AuditHelper,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async createCustomer(dto: RegisterDto): Promise<User> {
    await this.assertEmailUnique(dto.email);

    const user = this.userRepo.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      role: Role.CUSTOMER,
      firstName: dto.firstName,
      lastName: dto.lastName,
      nhsNumber: dto.nhsNumber ?? null,
      phone: dto.phone ?? null,
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
    });

    return this.userRepo.save(user);
  }

  async createPrescriber(dto: RegisterPrescriberDto): Promise<User> {
    await this.assertEmailUnique(dto.email);
    await this.assertGphcUnique(dto.gphcNumber);

    const user = this.userRepo.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      role: Role.PRESCRIBER,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone ?? null,
    });

    const savedUser = await this.userRepo.save(user);

    const profile = this.prescriberProfileRepo.create({
      userId: savedUser.id,
      gphcNumber: dto.gphcNumber,
      specialisation: dto.specialisation ?? null,
      organisation: dto.organisation ?? null,
    });

    await this.prescriberProfileRepo.save(profile);
    return savedUser;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findById(id: string, withProfile = false): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id, isActive: true },
      relations: withProfile ? ['prescriberProfile'] : [],
    });

    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email: email.toLowerCase().trim(), isActive: true },
    });
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async updateRole(targetUserId: string, role: Role, adminId: string): Promise<User> {
    const user = await this.findById(targetUserId);
    const previousRole = user.role;
    user.role = role;
    const saved = await this.userRepo.save(user);
    await this.auditHelper.logRoleChanged(adminId, targetUserId, previousRole, role);
    return saved;
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  async deactivate(targetUserId: string, adminId: string): Promise<void> {
    const user = await this.findById(targetUserId);
    user.isActive = false;
    await this.userRepo.save(user);
    await this.auditHelper.logUserDeactivated(adminId, targetUserId);
  }

  // ── Password ───────────────────────────────────────────────────────────────

  async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userRepo.update(userId, { passwordHash: hash });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async assertEmailUnique(email: string): Promise<void> {
    const exists = await this.userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
      withDeleted: true,
    });
    if (exists) {
      throw new ConflictException('An account with this email already exists');
    }
  }

  private async assertGphcUnique(gphcNumber: string): Promise<void> {
    const exists = await this.prescriberProfileRepo.findOne({
      where: { gphcNumber },
    });
    if (exists) {
      throw new ConflictException('This GPhC number is already registered');
    }
  }
}
