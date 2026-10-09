import { describe, it, expect } from 'vitest';
import { allocationService } from '../../src/services/allocation/index.js';
import { recoveryService } from '../../src/services/recovery/index.js';
import { auditService } from '../../src/services/audit/index.js';
import { validationService } from '../../src/services/validation/index.js';
import { mockRooms, mockBookingRequests } from '../fixtures/sharedFixtures.js';
import { DisruptionEvent } from '../../../shared/types/index.js';

describe('Shared Service Boundaries & Contract Conformance Tests', () => {
  it('AllocationService satisfies IAllocationService and reports Phase 1 status on main', async () => {
    expect(typeof allocationService.runAllocation).toBe('function');

    await expect(
      allocationService.runAllocation(mockBookingRequests, mockRooms, 'FIRST_FIT')
    ).rejects.toThrow(/AllocationService logic for 'FIRST_FIT' not implemented in Phase 1 foundation/);

    await expect(
      allocationService.runAllocation(mockBookingRequests, mockRooms, 'HEURISTIC')
    ).rejects.toThrow(/AllocationService logic for 'HEURISTIC' not implemented in Phase 1 foundation/);
  });

  it('RecoveryService satisfies IRecoveryService and reports Phase 1 status on main', async () => {
    expect(typeof recoveryService.handleRoomClosure).toBe('function');

    const event: DisruptionEvent = {
      roomId: 'room-101',
      reason: 'Inspection',
    };

    await expect(recoveryService.handleRoomClosure(event)).rejects.toThrow(
      /RecoveryService logic not implemented in Phase 1 foundation/
    );
  });

  it('AuditService satisfies IAuditService and logs actions according to contract', async () => {
    expect(typeof auditService.logAction).toBe('function');

    const logEntry = await auditService.logAction(
      'user-123',
      'SYSTEM_ADMIN',
      'ROOM_BLOCKED',
      'room-101',
      { reason: 'Maintenance' }
    );

    expect(logEntry.userId).toBe('user-123');
    expect(logEntry.userRole).toBe('SYSTEM_ADMIN');
    expect(logEntry.action).toBe('ROOM_BLOCKED');
    expect(logEntry.resource).toBe('room-101');
    expect(logEntry.timestamp).toBeDefined();
  });

  it('ValidationService satisfies IValidationService and validates candidate assignments', () => {
    expect(typeof validationService.validateAssignment).toBe('function');

    const result = validationService.validateAssignment(
      mockBookingRequests[0],
      mockRooms[0],
      []
    );

    expect(result).toHaveProperty('isValid');
    expect(Array.isArray(result.violations)).toBe(true);
  });
});
