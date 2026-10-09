import {
  AllocationResult,
  BookingRequest,
  Room,
  TimeSlot,
} from '../../../../shared/types/index.js';

/**
 * Standardized typed allocation metrics container.
 */
export interface AllocationMetrics {
  totalOccurrences: number;
  assignedOccurrences: number;
  unassignedOccurrences: number;
  allocationSuccessRate: number; // percentage (0-100)
  seatUtilization: number;        // percentage (0-100)
  capacityWasteTotal: number;     // sum of (room capacity - enrollment)
  capacityWasteAverage: number;   // average seats wasted per assigned class
  roomTimeUtilization: number;    // occupied room-time slots / available room-time slots * 100
  hardConstraintConflictCount: number;
  preferenceSatisfaction: number; // percentage (0-100)
  recoveryDisruptionCount?: number;
  breakdown: {
    totalEnrolledInAssigned: number;
    totalAssignedRoomCapacity: number;
    occupiedRoomTimeSlots: number;
    availableRoomTimeSlots: number;
    preferenceDefinition: string;
  };
}

export interface MetricsComparisonResult {
  baselineMethod: string;
  heuristicMethod: string;
  baselineMetrics: AllocationMetrics;
  heuristicMetrics: AllocationMetrics;
  deltas: {
    successRateDelta: number;               // heuristic - baseline (% points)
    seatUtilizationDelta: number;           // heuristic - baseline (% points)
    capacityWasteReduction: number;         // baseline waste - heuristic waste
    capacityWasteReductionPercent: number;  // (waste reduction / baseline waste) * 100
    roomTimeUtilizationDelta: number;       // heuristic - baseline (% points)
    conflictCountDelta: number;             // heuristic - baseline
    preferenceSatisfactionDelta: number;    // heuristic - baseline (% points)
    executionTimeMsDelta: number;           // baseline time - heuristic time
  };
  evaluation: {
    superiorMethod: 'HEURISTIC' | 'BASELINE' | 'IDENTICAL';
    summary: string;
    details: string[];
  };
  timestamp: string;
}

export interface IMetricsService {
  calculateMetrics(
    requests: BookingRequest[],
    rooms: Room[],
    disruptionCount?: number
  ): AllocationMetrics;
  compareResults(
    baseline: AllocationResult,
    heuristic: AllocationResult,
    datasetContext?: { requests: BookingRequest[]; rooms: Room[] }
  ): MetricsComparisonResult;
}

export class MetricsService implements IMetricsService {
  public static readonly PREFERENCE_DEFINITION =
    'Preference satisfaction measures soft constraints for assigned bookings: (1) Department Affinity: room building matches booking department; (2) Over-provisioning efficiency: room capacity is within 2x enrollment count (avoiding wasting large lecture halls for small classes). Evaluates (met preferences / applicable preferences) * 100. Defaults safely to 100% when no soft preferences are specified.';

  /**
   * Computes all 7 required metrics from actual allocation state.
   * Defends against zero denominators, avoids conflating seat utilization with room-time utilization,
   * and prevents duplicate conflict counts.
   */
  public calculateMetrics(
    requests: BookingRequest[],
    rooms: Room[],
    disruptionCount?: number
  ): AllocationMetrics {
    const totalOccurrences = requests.length;
    const roomMap = new Map<string, Room>();
    for (const r of rooms) {
      const id = r.id || (r as any)._id?.toString();
      if (id) roomMap.set(id, r);
    }

    let assignedOccurrences = 0;
    let unassignedOccurrences = 0;
    let totalEnrolledInAssigned = 0;
    let totalAssignedRoomCapacity = 0;
    let capacityWasteTotal = 0;
    let hardConstraintConflictCount = 0;

    // Track occupied (room, time slot) combinations
    const occupiedRoomSlotKeys = new Set<string>();

    // Preference tracking
    let applicablePreferences = 0;
    let metPreferences = 0;

    // Track all distinct time slots in schedule to compute available room-time slots
    const distinctSlotKeys = new Set<string>();

    for (const req of requests) {
      const slotKey = `${req.slot.dayOfWeek}-${req.slot.startTime}-${req.slot.endTime}-${req.slot.date || ''}`;
      distinctSlotKeys.add(slotKey);

      const assignedRoomId = req.assignedRoomId ? req.assignedRoomId.toString() : undefined;
      const assignedRoom = assignedRoomId ? roomMap.get(assignedRoomId) : undefined;

      if (assignedRoom) {
        assignedOccurrences += 1;
        totalEnrolledInAssigned += req.enrollmentCount;
        totalAssignedRoomCapacity += assignedRoom.capacity;

        const waste = Math.max(0, assignedRoom.capacity - req.enrollmentCount);
        capacityWasteTotal += waste;

        const roomSlotKey = `${assignedRoomId}|${slotKey}`;
        occupiedRoomSlotKeys.add(roomSlotKey);

        // Soft Preference 1: Department Affinity
        if (req.department) {
          applicablePreferences += 1;
          const dept = req.department.trim().toLowerCase();
          const bldg = assignedRoom.building.trim().toLowerCase();
          if (bldg.includes(dept) || dept.includes(bldg)) {
            metPreferences += 1;
          }
        }

        // Soft Preference 2: Size Proportionality (not over-provisioned > 2x)
        applicablePreferences += 1;
        if (assignedRoom.capacity <= req.enrollmentCount * 2) {
          metPreferences += 1;
        }
      } else {
        unassignedOccurrences += 1;
        // Hard constraint conflict accounted once per unassigned request
        hardConstraintConflictCount += 1;
      }
    }

    // Zero-denominator safe metric calculations
    const allocationSuccessRate =
      totalOccurrences === 0
        ? 0
        : Number(((assignedOccurrences / totalOccurrences) * 100).toFixed(2));

    const seatUtilization =
      totalAssignedRoomCapacity === 0
        ? 0
        : Number(((totalEnrolledInAssigned / totalAssignedRoomCapacity) * 100).toFixed(2));

    const capacityWasteAverage =
      assignedOccurrences === 0
        ? 0
        : Number((capacityWasteTotal / assignedOccurrences).toFixed(2));

    // Room-time utilization: occupied (room, slot) / (operational rooms * total schedule slots) * 100
    const operationalRoomsCount = rooms.filter((r) => !r.isBlocked).length;
    const totalScheduleSlotsCount = distinctSlotKeys.size;
    const availableRoomTimeSlots = operationalRoomsCount * totalScheduleSlotsCount;
    const occupiedRoomTimeSlots = occupiedRoomSlotKeys.size;

    const roomTimeUtilization =
      availableRoomTimeSlots === 0
        ? 0
        : Number(((occupiedRoomTimeSlots / availableRoomTimeSlots) * 100).toFixed(2));

    const preferenceSatisfaction =
      applicablePreferences === 0
        ? 100
        : Number(((metPreferences / applicablePreferences) * 100).toFixed(2));

    return {
      totalOccurrences,
      assignedOccurrences,
      unassignedOccurrences,
      allocationSuccessRate,
      seatUtilization,
      capacityWasteTotal,
      capacityWasteAverage,
      roomTimeUtilization,
      hardConstraintConflictCount,
      preferenceSatisfaction,
      recoveryDisruptionCount: disruptionCount ?? 0,
      breakdown: {
        totalEnrolledInAssigned,
        totalAssignedRoomCapacity,
        occupiedRoomTimeSlots,
        availableRoomTimeSlots,
        preferenceDefinition: MetricsService.PREFERENCE_DEFINITION,
      },
    };
  }

  /**
   * Compares First-Fit baseline vs Improved Heuristic runs on identical inputs.
   */
  public compareResults(
    baseline: AllocationResult,
    heuristic: AllocationResult,
    datasetContext?: { requests: BookingRequest[]; rooms: Room[] }
  ): MetricsComparisonResult {
    let baselineMetrics: AllocationMetrics;
    let heuristicMetrics: AllocationMetrics;

    if (datasetContext) {
      // Reconstruct actual assignment maps to compute deep metrics
      const baselineReqs = datasetContext.requests.map((r) => {
        const assignment = baseline.assignments.find((a) => a.bookingId === r.id);
        return {
          ...r,
          assignedRoomId: assignment ? assignment.roomId : undefined,
        };
      });

      const heuristicReqs = datasetContext.requests.map((r) => {
        const assignment = heuristic.assignments.find((a) => a.bookingId === r.id);
        return {
          ...r,
          assignedRoomId: assignment ? assignment.roomId : undefined,
        };
      });

      baselineMetrics = this.calculateMetrics(baselineReqs, datasetContext.rooms);
      heuristicMetrics = this.calculateMetrics(heuristicReqs, datasetContext.rooms);
    } else {
      // Synthesize metrics from AllocationResult summaries when full dataset context is omitted
      const totalBaseline = baseline.metrics.totalRequested;
      const totalHeuristic = heuristic.metrics.totalRequested;

      baselineMetrics = {
        totalOccurrences: totalBaseline,
        assignedOccurrences: baseline.metrics.assignedCount,
        unassignedOccurrences: baseline.metrics.unassignedCount,
        allocationSuccessRate:
          totalBaseline === 0
            ? 0
            : Number(((baseline.metrics.assignedCount / totalBaseline) * 100).toFixed(2)),
        seatUtilization: 0,
        capacityWasteTotal: baseline.metrics.capacityWasteAverage * baseline.metrics.assignedCount,
        capacityWasteAverage: baseline.metrics.capacityWasteAverage,
        roomTimeUtilization: 0,
        hardConstraintConflictCount: baseline.metrics.unassignedCount,
        preferenceSatisfaction: 100,
        recoveryDisruptionCount: 0,
        breakdown: {
          totalEnrolledInAssigned: 0,
          totalAssignedRoomCapacity: 0,
          occupiedRoomTimeSlots: baseline.metrics.assignedCount,
          availableRoomTimeSlots: 0,
          preferenceDefinition: MetricsService.PREFERENCE_DEFINITION,
        },
      };

      heuristicMetrics = {
        totalOccurrences: totalHeuristic,
        assignedOccurrences: heuristic.metrics.assignedCount,
        unassignedOccurrences: heuristic.metrics.unassignedCount,
        allocationSuccessRate:
          totalHeuristic === 0
            ? 0
            : Number(((heuristic.metrics.assignedCount / totalHeuristic) * 100).toFixed(2)),
        seatUtilization: 0,
        capacityWasteTotal: heuristic.metrics.capacityWasteAverage * heuristic.metrics.assignedCount,
        capacityWasteAverage: heuristic.metrics.capacityWasteAverage,
        roomTimeUtilization: 0,
        hardConstraintConflictCount: heuristic.metrics.unassignedCount,
        preferenceSatisfaction: 100,
        recoveryDisruptionCount: 0,
        breakdown: {
          totalEnrolledInAssigned: 0,
          totalAssignedRoomCapacity: 0,
          occupiedRoomTimeSlots: heuristic.metrics.assignedCount,
          availableRoomTimeSlots: 0,
          preferenceDefinition: MetricsService.PREFERENCE_DEFINITION,
        },
      };
    }

    const successRateDelta = Number(
      (heuristicMetrics.allocationSuccessRate - baselineMetrics.allocationSuccessRate).toFixed(2)
    );
    const seatUtilizationDelta = Number(
      (heuristicMetrics.seatUtilization - baselineMetrics.seatUtilization).toFixed(2)
    );
    const capacityWasteReduction = Number(
      (baselineMetrics.capacityWasteTotal - heuristicMetrics.capacityWasteTotal).toFixed(2)
    );
    const capacityWasteReductionPercent =
      baselineMetrics.capacityWasteTotal === 0
        ? 0
        : Number(
            (
              (capacityWasteReduction / baselineMetrics.capacityWasteTotal) *
              100
            ).toFixed(2)
          );
    const roomTimeUtilizationDelta = Number(
      (heuristicMetrics.roomTimeUtilization - baselineMetrics.roomTimeUtilization).toFixed(2)
    );
    const conflictCountDelta =
      heuristicMetrics.hardConstraintConflictCount - baselineMetrics.hardConstraintConflictCount;
    const preferenceSatisfactionDelta = Number(
      (heuristicMetrics.preferenceSatisfaction - baselineMetrics.preferenceSatisfaction).toFixed(2)
    );
    const executionTimeMsDelta =
      (baseline.metrics.executionTimeMs || 0) - (heuristic.metrics.executionTimeMs || 0);

    const details: string[] = [];
    if (successRateDelta > 0) {
      details.push(`Heuristic achieved +${successRateDelta}% higher allocation success rate.`);
    } else if (successRateDelta < 0) {
      details.push(`Baseline had ${Math.abs(successRateDelta)}% higher allocation rate.`);
    } else {
      details.push(`Both algorithms achieved identical allocation success rate (${heuristicMetrics.allocationSuccessRate}%).`);
    }

    if (capacityWasteReduction > 0) {
      details.push(
        `Heuristic reduced capacity waste by ${capacityWasteReduction} seats (${capacityWasteReductionPercent}% reduction).`
      );
    } else if (capacityWasteReduction < 0) {
      details.push(`Baseline generated fewer wasted seats.`);
    }

    if (seatUtilizationDelta > 0) {
      details.push(`Heuristic improved seat utilization by +${seatUtilizationDelta}%.`);
    }

    // Overall winner evaluation
    let superiorMethod: 'HEURISTIC' | 'BASELINE' | 'IDENTICAL' = 'IDENTICAL';
    if (
      heuristicMetrics.allocationSuccessRate > baselineMetrics.allocationSuccessRate ||
      (heuristicMetrics.allocationSuccessRate === baselineMetrics.allocationSuccessRate &&
        heuristicMetrics.capacityWasteTotal < baselineMetrics.capacityWasteTotal)
    ) {
      superiorMethod = 'HEURISTIC';
    } else if (
      baselineMetrics.allocationSuccessRate > heuristicMetrics.allocationSuccessRate ||
      (baselineMetrics.allocationSuccessRate === heuristicMetrics.allocationSuccessRate &&
        baselineMetrics.capacityWasteTotal < heuristicMetrics.capacityWasteTotal)
    ) {
      superiorMethod = 'BASELINE';
    }

    const summary =
      superiorMethod === 'HEURISTIC'
        ? `Improved Heuristic outperformed First-Fit with ${capacityWasteReductionPercent}% waste reduction and ${successRateDelta >= 0 ? '+' : ''}${successRateDelta}% allocation rate difference.`
        : superiorMethod === 'BASELINE'
        ? `First-Fit outperformed Heuristic on this specific dataset distribution.`
        : `Both algorithms produced identical allocation quality across all hard constraints.`;

    return {
      baselineMethod: baseline.method,
      heuristicMethod: heuristic.method,
      baselineMetrics,
      heuristicMetrics,
      deltas: {
        successRateDelta,
        seatUtilizationDelta,
        capacityWasteReduction,
        capacityWasteReductionPercent,
        roomTimeUtilizationDelta,
        conflictCountDelta,
        preferenceSatisfactionDelta,
        executionTimeMsDelta,
      },
      evaluation: {
        superiorMethod,
        summary,
        details,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const metricsService = new MetricsService();
