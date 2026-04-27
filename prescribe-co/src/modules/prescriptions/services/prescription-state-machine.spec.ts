import { BadRequestException } from '@nestjs/common';
import { PrescriptionStateMachine } from './prescription-state-machine.service';
import { PrescriptionStatus } from '../../../common/enums/prescription.enums';

describe('PrescriptionStateMachine', () => {
  let sm: PrescriptionStateMachine;

  beforeEach(() => {
    sm = new PrescriptionStateMachine();
  });

  describe('assertTransition — valid paths', () => {
    const validPaths: [PrescriptionStatus, PrescriptionStatus][] = [
      [PrescriptionStatus.DRAFT,        PrescriptionStatus.SUBMITTED],
      [PrescriptionStatus.DRAFT,        PrescriptionStatus.CANCELLED],
      [PrescriptionStatus.SUBMITTED,    PrescriptionStatus.UNDER_REVIEW],
      [PrescriptionStatus.SUBMITTED,    PrescriptionStatus.CANCELLED],
      [PrescriptionStatus.UNDER_REVIEW, PrescriptionStatus.APPROVED],
      [PrescriptionStatus.UNDER_REVIEW, PrescriptionStatus.REJECTED],
      [PrescriptionStatus.APPROVED,     PrescriptionStatus.DISPENSING],
      [PrescriptionStatus.DISPENSING,   PrescriptionStatus.FULFILLED],
    ];

    it.each(validPaths)('%s → %s should not throw', (from, to) => {
      expect(() => sm.assertTransition(from, to)).not.toThrow();
    });
  });

  describe('assertTransition — invalid paths', () => {
    const invalidPaths: [PrescriptionStatus, PrescriptionStatus][] = [
      [PrescriptionStatus.DRAFT,     PrescriptionStatus.APPROVED],
      [PrescriptionStatus.SUBMITTED, PrescriptionStatus.FULFILLED],
      [PrescriptionStatus.APPROVED,  PrescriptionStatus.SUBMITTED],
      [PrescriptionStatus.FULFILLED, PrescriptionStatus.DRAFT],
      [PrescriptionStatus.CANCELLED, PrescriptionStatus.SUBMITTED],
      [PrescriptionStatus.REJECTED,  PrescriptionStatus.APPROVED],
    ];

    it.each(invalidPaths)('%s → %s should throw BadRequestException', (from, to) => {
      expect(() => sm.assertTransition(from, to)).toThrow(BadRequestException);
    });
  });

  describe('isTerminal', () => {
    it.each([
      PrescriptionStatus.FULFILLED,
      PrescriptionStatus.REJECTED,
      PrescriptionStatus.CANCELLED,
      PrescriptionStatus.EXPIRED,
    ])('%s is terminal', (status) => {
      expect(sm.isTerminal(status)).toBe(true);
    });

    it.each([
      PrescriptionStatus.DRAFT,
      PrescriptionStatus.SUBMITTED,
      PrescriptionStatus.UNDER_REVIEW,
      PrescriptionStatus.APPROVED,
      PrescriptionStatus.DISPENSING,
    ])('%s is not terminal', (status) => {
      expect(sm.isTerminal(status)).toBe(false);
    });
  });

  describe('availableTransitions', () => {
    it('returns SUBMITTED and CANCELLED for DRAFT', () => {
      const transitions = sm.availableTransitions(PrescriptionStatus.DRAFT);
      expect(transitions).toContain(PrescriptionStatus.SUBMITTED);
      expect(transitions).toContain(PrescriptionStatus.CANCELLED);
    });

    it('returns empty array for terminal states', () => {
      expect(sm.availableTransitions(PrescriptionStatus.FULFILLED)).toHaveLength(0);
    });
  });
});
