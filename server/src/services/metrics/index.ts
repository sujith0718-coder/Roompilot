import { AllocationResult } from '../../../../shared/types/index.js';

/**
 * Service Boundary: Allocation Metrics Service
 * Computes comparative performance analytics between First-Fit and Improved Heuristic algorithms.
 */
export interface IMetricsService {
  compareResults(baseline: AllocationResult, heuristic: AllocationResult): Record<string, unknown>;
}

export class MetricsService implements IMetricsService {
  public compareResults(baseline: AllocationResult, heuristic: AllocationResult): Record<string, unknown> {
    return {
      baselineMethod: baseline.method,
      heuristicMethod: heuristic.method,
      baselineAssigned: baseline.metrics.assignedCount,
      heuristicAssigned: heuristic.metrics.assignedCount,
      wasteReduction: baseline.metrics.capacityWasteAverage - heuristic.metrics.capacityWasteAverage,
    };
  }
}

export const metricsService = new MetricsService();
