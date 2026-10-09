import { DisruptionEvent, RecoveryReport } from '../../../../shared/types/index.js';

/**
 * Service Boundary: Disruption Recovery Service
 * Handles sudden room closures and computes minimal reassignment actions.
 */
export interface IRecoveryService {
  handleRoomClosure(event: DisruptionEvent): Promise<RecoveryReport>;
}

export class RecoveryService implements IRecoveryService {
  public async handleRoomClosure(_event: DisruptionEvent): Promise<RecoveryReport> {
    throw new Error('RecoveryService logic not implemented in Phase 1 foundation.');
  }
}

export const recoveryService = new RecoveryService();
