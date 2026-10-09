import { describe, it, expect } from 'vitest';
import { metricsService } from '../../src/services/metrics/index.js';
import { AllocationResult } from '../../../shared/types/index.js';
import { computeAllocationMetrics } from '../helpers/domainAlgorithms.js';
import { mockRooms, mockBookingRequests } from '../fixtures/sharedFixtures.js';

describe('Metrics Service — Allocation Analytics & Comparison Tests', () => {
  const dummyBaselineResult: AllocationResult = {
    method: 'FIRST_FIT',
    assignments: [
      { bookingId: 'req-001', roomId: 'room-102', explanation: 'Assigned LH-102' },
    ],
    unassigned: [],
    metrics: {
      totalRequested: 1,
      assignedCount: 1,
      unassignedCount: 0,
      capacityWasteAverage: 25, // 60 - 35 = 25 seats wasted
      executionTimeMs: 4,
    },
    timestamp: '2026-10-09T10:00:00.000Z',
  };

  const dummyHeuristicResult: AllocationResult = {
    method: 'HEURISTIC',
    assignments: [
      { bookingId: 'req-001', roomId: 'room-101', explanation: 'Assigned LH-101' },
    ],
    unassigned: [],
    metrics: {
      totalRequested: 1,
      assignedCount: 1,
      unassignedCount: 0,
      capacityWasteAverage: 5, // 40 - 35 = 5 seats wasted (much tighter fit!)
      executionTimeMs: 6,
    },
    timestamp: '2026-10-09T10:00:00.000Z',
  };

  describe('Existing MetricsService (server/src/services/metrics)', () => {
    it('compares baseline and heuristic outputs correctly', () => {
      const comparison = metricsService.compareResults(dummyBaselineResult, dummyHeuristicResult);

      expect(comparison.baselineMethod).toBe('FIRST_FIT');
      expect(comparison.heuristicMethod).toBe('HEURISTIC');
      expect(comparison.baselineAssigned).toBe(1);
      expect(comparison.heuristicAssigned).toBe(1);
      // wasteReduction = baselineWaste (25) - heuristicWaste (5) = 20
      expect(comparison.wasteReduction).toBe(20);
    });

    it('accurately detects zero or negative waste reduction when baseline matches heuristic', () => {
      const comparison = metricsService.compareResults(dummyBaselineResult, dummyBaselineResult);
      expect(comparison.wasteReduction).toBe(0);
    });
  });

  describe('computeAllocationMetrics function', () => {
    it('calculates average capacity waste accurately across multiple assignments', () => {
      // Room 101 (cap 40), Req 001 (enrollment 35) -> waste = 5
      // Room 102 (cap 60), Req 004 (enrollment 38) -> waste = 22
      // Average waste = (5 + 22) / 2 = 13.5
      const assignments = [
        { bookingId: 'req-001', roomId: 'room-101' },
        { bookingId: 'req-004', roomId: 'room-102' },
      ];
      const unassigned = [
        { bookingId: 'req-002', reason: 'Too big', evaluatedRoomsCount: 6 },
      ];

      const metrics = computeAllocationMetrics(
        mockBookingRequests,
        assignments,
        unassigned,
        mockRooms,
        12
      );

      expect(metrics.totalRequested).toBe(mockBookingRequests.length);
      expect(metrics.assignedCount).toBe(2);
      expect(metrics.unassignedCount).toBe(1);
      expect(metrics.capacityWasteAverage).toBe(13.5);
      expect(metrics.executionTimeMs).toBe(12);
    });

    it('returns zero capacity waste when there are zero assignments', () => {
      const metrics = computeAllocationMetrics(
        mockBookingRequests,
        [],
        [{ bookingId: 'req-1', reason: 'No room', evaluatedRoomsCount: 6 }],
        mockRooms,
        2
      );

      expect(metrics.assignedCount).toBe(0);
      expect(metrics.capacityWasteAverage).toBe(0);
    });
  });
});
