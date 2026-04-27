import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from './audit-action.enum';

const mockRepo = {
  create: jest.fn().mockImplementation((dto) => dto),
  save: jest.fn().mockResolvedValue({ id: 'audit-001' }),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  find: jest.fn().mockResolvedValue([]),
};

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('persists an audit record successfully', async () => {
      await service.log({
        actorId: 'user-001',
        gphcNumber: '1234567',
        actorRole: 'PRESCRIBER',
        action: AuditAction.PRESCRIPTION_APPROVED,
        entityType: 'prescription_requests',
        entityId: 'presc-001',
        metadata: { reason: 'test' },
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-001',
          gphcNumber: '1234567',
          action: AuditAction.PRESCRIPTION_APPROVED,
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('never throws even when DB save fails', async () => {
      mockRepo.save.mockRejectedValueOnce(new Error('DB down'));

      await expect(
        service.log({
          actorId: null,
          action: AuditAction.PRESCRIPTION_VIEWED,
          entityType: 'prescription_requests',
          entityId: 'presc-001',
        }),
      ).resolves.toBeUndefined(); // no throw
    });

    it('handles null actorId for system events', async () => {
      await service.log({
        actorId: null,
        action: AuditAction.PRESCRIPTION_EXPIRED,
        entityType: 'prescription_requests',
        entityId: 'presc-001',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ actorId: null }),
      );
    });
  });

  describe('logPrescriberAction', () => {
    it('always sets actorRole to PRESCRIBER', async () => {
      await service.logPrescriberAction({
        prescriberId: 'prescriber-001',
        gphcNumber: '7654321',
        action: AuditAction.PRESCRIPTION_REJECTED,
        prescriptionId: 'presc-002',
        beforeState: { status: 'UNDER_REVIEW' },
        afterState: { status: 'REJECTED' },
        metadata: { rejectionReason: 'Contraindicated' },
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          actorRole: 'PRESCRIBER',
          gphcNumber: '7654321',
          entityType: 'prescription_requests',
        }),
      );
    });
  });

  describe('query', () => {
    it('delegates to repository with correct filters', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.query({
        action: AuditAction.PRESCRIPTION_APPROVED,
        gphcNumber: '1234567',
        page: 1,
        limit: 10,
      });

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: AuditAction.PRESCRIPTION_APPROVED,
            gphcNumber: '1234567',
          }),
          take: 10,
          skip: 0,
        }),
      );
    });
  });
});
