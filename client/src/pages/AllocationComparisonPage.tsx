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
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        breadcrumbs={['Operations', 'Algorithmic Comparison']}
        title="Baseline vs Heuristic Allocation Benchmark"
        description="Comparative analytics evaluating baseline First-Fit assignment against the constrained-first Heuristic algorithm. Evaluates capacity waste, assignment throughput, and execution latency."
        badge="Performance Analytics"
        action={
          isAuthorizedToRun ? (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleRunAllocation('FIRST_FIT')}
                disabled={isRunningAllocation}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold transition-all border border-slate-700 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 text-slate-400" />
                <span>Run First-Fit</span>
              </button>
              <button
                onClick={() => handleRunAllocation('HEURISTIC')}
                disabled={isRunningAllocation}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-mono font-bold tracking-wider shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95"
              >
                <Zap className="w-4 h-4 text-white" />
                <span>Execute Heuristic</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {error && <AlertBanner type="error" title="Error" message={error} onClose={() => setError(null)} />}

      {lastRunResult && (
        <AlertBanner
          type="success"
          title={`Allocation Engine Run Succeeded (${lastRunResult.method})`}
          message={`Assigned ${lastRunResult.metrics.assignedCount} of ${lastRunResult.metrics.totalRequested} requests in ${lastRunResult.metrics.executionTimeMs}ms. Average capacity waste: ${lastRunResult.metrics.capacityWasteAverage} seats per assignment.`}
        />
      )}

      {isLoading ? (
        <LoadingSpinner label="Computing Algorithmic Comparison Metrics..." />
      ) : metrics ? (
        <>
          {/* Top Level Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="First-Fit Assigned Rate"
              value={`${Math.round(
                (metrics.firstFit.assignedCount / (metrics.firstFit.totalRequested || 1)) * 100
              )}%`}
              subtext={`${metrics.firstFit.assignedCount} of ${metrics.firstFit.totalRequested} requests`}
              icon={BarChart3}
              color="indigo"
            />
            <StatCard
              title="Heuristic Assigned Rate"
              value={`${Math.round(
                (metrics.heuristic.assignedCount / (metrics.heuristic.totalRequested || 1)) * 100
              )}%`}
              subtext={`${metrics.heuristic.assignedCount} of ${metrics.heuristic.totalRequested} requests`}
              icon={Zap}
              trend={{
                value: `+${metrics.improvementPercentage.capacityEfficiency}% Waste Reduced`,
                isPositive: true,
              }}
              color="emerald"
            />
            <StatCard
              title="Capacity Waste Avg"
              value={`${metrics.heuristic.capacityWasteAverage} seats`}
              subtext={`Baseline First-Fit: ${metrics.firstFit.capacityWasteAverage} seats`}
              icon={TrendingUp}
              color="cyan"
            />
            <StatCard
              title="Execution Latency"
              value={`${metrics.heuristic.executionTimeMs} ms`}
              subtext={`Baseline First-Fit: ${metrics.firstFit.executionTimeMs} ms`}
              icon={Cpu}
              color="purple"
            />
          </div>

          {/* Side-by-Side Comparison Graphs & Detail Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* First-Fit Card */}
            <div className="p-6 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-3xl space-y-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Baseline: First-Fit Algorithm</h3>
                    <p className="text-xs text-slate-400 font-mono">Greedy first-available room assignment</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-xs border border-slate-700">
                  Baseline
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Total Requested:</span>
                  <span className="text-slate-200">{metrics.firstFit.totalRequested}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Assigned Count:</span>
                  <span className="text-emerald-400 font-bold">{metrics.firstFit.assignedCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Unassigned Count:</span>
                  <span className="text-amber-400 font-bold">{metrics.firstFit.unassignedCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Avg Seat Waste per Room:</span>
                  <span className="text-rose-400 font-bold">{metrics.firstFit.capacityWasteAverage} seats</span>
                </div>
              </div>
            </div>

            {/* Heuristic Card */}
            <div className="p-6 bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 rounded-3xl space-y-5 shadow-xl shadow-cyan-950/20">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">Optimized: Constrained Heuristic</h3>
                    <p className="text-xs text-slate-400 font-mono">Most-constrained occurrence prioritization</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-xs border border-cyan-500/30 font-bold">
                  Recommended
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Total Requested:</span>
                  <span className="text-slate-200">{metrics.heuristic.totalRequested}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Assigned Count:</span>
                  <span className="text-emerald-400 font-bold">{metrics.heuristic.assignedCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Unassigned Count:</span>
                  <span className="text-cyan-400 font-bold">{metrics.heuristic.unassignedCount}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Avg Seat Waste per Room:</span>
                  <span className="text-emerald-400 font-bold">{metrics.heuristic.capacityWasteAverage} seats</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
