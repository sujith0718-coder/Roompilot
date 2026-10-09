import { BookingRequest, HardConstraintValidationResult, Room } from '../../../../shared/types/index.js';

/**
 * Service Boundary: Hard-Constraint Validator
 * Decoupled independent hard-constraint checker for room assignments.
 */
export interface IValidationService {
  validateAssignment(
    request: BookingRequest,
    room: Room,
    existingAssignments: { roomId: string; slot: BookingRequest['slot'] }[]
  ): HardConstraintValidationResult;
}

export class ValidationService implements IValidationService {
  public validateAssignment(
    request: BookingRequest,
    room: Room,
    _existingAssignments: { roomId: string; slot: BookingRequest['slot'] }[]
  ): HardConstraintValidationResult {
    const violations: string[] = [];

    if (room.isBlocked) {
      violations.push(`Room ${room.code} is closed or blocked (${room.blockReason || 'No reason provided'}).`);
    }

    if (room.capacity < request.enrollmentCount) {
      violations.push(`Room capacity (${room.capacity}) is smaller than enrollment count (${request.enrollmentCount}).`);
    }

    const missingFacilities = request.requiredFacilities.filter(
      (facility) => !room.facilities.includes(facility)
    );
    if (missingFacilities.length > 0) {
      violations.push(`Room lacks required facilities: ${missingFacilities.join(', ')}.`);
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}

export const validationService = new ValidationService();
