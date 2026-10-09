import { AllocationMethod, AllocationResult, BookingRequest, Room } from '../../../../shared/types/index.js';

/**
 * Service Boundary: Allocation Engine
 * Responsible for running First-Fit baseline and Improved Heuristic allocation algorithms.
 * Full business logic to be implemented in Feature Phase.
 */
export interface IAllocationService {
  runAllocation(
    requests: BookingRequest[],
    rooms: Room[],
    method: AllocationMethod
  ): Promise<AllocationResult>;
}

export class AllocationService implements IAllocationService {
  public async runAllocation(
    _requests: BookingRequest[],
    _rooms: Room[],
    method: AllocationMethod
  ): Promise<AllocationResult> {
    throw new Error(`AllocationService logic for '${method}' not implemented in Phase 1 foundation.`);
  }
}

export const allocationService = new AllocationService();
