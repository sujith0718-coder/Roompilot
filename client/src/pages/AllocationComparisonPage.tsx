import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AllocationResult, AllocationMethod } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertBanner } from '../components/AlertBanner';
import {
  BarChart3,
  Zap,
  TrendingUp,
  Cpu,
  Play,
} from 'lucide-react';

export const AllocationComparisonPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'SYSTEM_ADMIN';

  const [metrics, setMetrics] = useState<{
    firstFit: AllocationResult['metrics'];
    heuristic: AllocationResult['metrics'];
    improvementPercentage: { capacityEfficiency: number; executionSpeed: number };
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAllocation, setIsRunningAllocation] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<AllocationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMetricsComparison();
      setMetrics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch allocation metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleRunAllocation = async (method: AllocationMethod) => {
    setIsRunningAllocation(true);
    setError(null);
    try {
      const result = await api.runAllocation(method);
      setLastRunResult(result);
      await loadMetrics();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Allocation execution failed');
    } finally {
      setIsRunningAllocation(false);
    }
  };

  const isAuthorizedToRun = ['SYSTEM_ADMIN', 'HOD', 'COE', 'PRINCIPAL'].includes(role);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Baseline vs Improved Allocation Comparison"
        description="Comparative analysis between baseline First-Fit assignment algorithm and improved Heuristic algorithm."
        badge="Algorithmic Metrics"
        action={
          isAuthorizedToRun ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRunAllocation('FIRST_FIT')}
                disabled={isRunningAllocation}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-slate-400" />
                <span>Run First-Fit</span>
              </button>
              <button
                onClick={() => handleRunAllocation('HEURISTIC')}
                disabled={isRunningAllocation}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Run Heuristic</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {error && <AlertBanner type="error" title="Error" message={error} />}

      {lastRunResult && (
        <AlertBanner
          type="success"
          title={`Allocation Run Complete (${lastRunResult.method})`}
          message={`Assigned ${lastRunResult.metrics.assignedCount} of ${lastRunResult.metrics.totalRequested} requests in ${lastRunResult.metrics.executionTimeMs}ms with ${lastRunResult.metrics.capacityWasteAverage} avg wasted capacity seats.`}
          onClose={() => setLastRunResult(null)}
        />
      )}

      {isLoading ? (
        <LoadingSpinner label="Computing comparative metrics..." />
      ) : metrics ? (
        <>
          {/* Comparison Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="First-Fit Assignment Rate"
              value={`${Math.round((metrics.firstFit.assignedCount / (metrics.firstFit.totalRequested || 1)) * 100)}%`}
              subtext={`${metrics.firstFit.assignedCount} of ${metrics.firstFit.totalRequested} assigned`}
              icon={BarChart3}
              color="amber"
            />
            <StatCard
              title="Heuristic Assignment Rate"
              value={`${Math.round((metrics.heuristic.assignedCount / (metrics.heuristic.totalRequested || 1)) * 100)}%`}
              subtext={`${metrics.heuristic.assignedCount} of ${metrics.heuristic.totalRequested} assigned`}
              icon={Zap}
              color="emerald"
              trend={{ value: `+${metrics.heuristic.assignedCount - metrics.firstFit.assignedCount} More Booked`, isPositive: true }}
            />
            <StatCard
              title="Capacity Waste Reduction"
              value={`${metrics.improvementPercentage.capacityEfficiency}%`}
              subtext={`Heuristic: ${metrics.heuristic.capacityWasteAverage} seats vs First-Fit: ${metrics.firstFit.capacityWasteAverage} seats`}
              icon={TrendingUp}
              color="cyan"
              trend={{ value: 'More Efficient', isPositive: true }}
            />
            <StatCard
              title="Execution Latency"
              value={`${metrics.heuristic.executionTimeMs} ms`}
              subtext={`First-Fit: ${metrics.firstFit.executionTimeMs} ms`}
              icon={Cpu}
              color="purple"
            />
          </div>

          {/* Side-by-Side Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* First-Fit Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Baseline — First-Fit Engine</h3>
                    <p className="text-xs text-slate-400">Standard Sequential Greedy Matching</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-semibold">
                  Baseline
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Assigned Requests:</span>
                  <span className="text-slate-200 font-bold">{metrics.firstFit.assignedCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Unassigned Requests:</span>
                  <span className="text-rose-400 font-bold">{metrics.firstFit.unassignedCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Avg Capacity Waste (Seats):</span>
                  <span className="text-amber-400 font-bold">{metrics.firstFit.capacityWasteAverage}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Execution Speed:</span>
                  <span className="text-slate-200 font-bold">{metrics.firstFit.executionTimeMs} ms</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800">
                First-Fit assigns the first available room satisfying hard capacity and facility constraints, often leading to seat fragmentation in large lecture halls.
              </p>
            </div>

            {/* Improved Heuristic Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Improved — Heuristic Engine</h3>
                    <p className="text-xs text-cyan-400">Tightest-Fit Capacity & Facility Scoring</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-semibold">
                  Improved
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between p-3 bg-slate-950/90 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Assigned Requests:</span>
                  <span className="text-emerald-400 font-bold">{metrics.heuristic.assignedCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950/90 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Unassigned Requests:</span>
                  <span className="text-cyan-400 font-bold">{metrics.heuristic.unassignedCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950/90 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Avg Capacity Waste (Seats):</span>
                  <span className="text-emerald-400 font-bold">{metrics.heuristic.capacityWasteAverage}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950/90 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Execution Speed:</span>
                  <span className="text-slate-200 font-bold">{metrics.heuristic.executionTimeMs} ms</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                Heuristic engine sorts bookings by attendance size and pairs them with the tightest matching room capacity, minimizing wasted seats and maximizing total campus throughput.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
