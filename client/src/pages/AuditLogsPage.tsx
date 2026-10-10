import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AuditLogEntry } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable, Column } from '../components/DataTable';
import { AlertBanner } from '../components/AlertBanner';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Eye, Code, X, Copy, Check, Filter } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'SYSTEM_ADMIN';

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [copied, setCopied] = useState(false);

  // Filters
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true);
      try {
        const logs = await api.getAuditLogs();
        setAuditLogs(logs);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch audit log trail');
      } finally {
        setIsLoading(false);
      }
    }
    loadLogs();
  }, []);

  const isAuthorized = ['PRINCIPAL', 'SYSTEM_ADMIN'].includes(role);

  if (!isAuthorized) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Authorized Audit Trail" badge="403 Forbidden" />
        <AlertBanner
          type="error"
          title="Access Denied (HTTP 403 Forbidden)"
          message={`Role '${role}' is not authorized to inspect security audit logs. Access is restricted exclusively to PRINCIPAL and SYSTEM_ADMIN roles.`}
        />
      </div>
    );
  }

  // Action options for filter pills
  const actionsList = Array.from(new Set(auditLogs.map((l) => l.action)));

  // Filtered dataset
  const filteredLogs = auditLogs.filter((log) => {
    const matchesAction = selectedActionFilter === 'ALL' || log.action === selectedActionFilter;
    const matchesRole = selectedRoleFilter === 'ALL' || log.userRole === selectedRoleFilter;
    return matchesAction && matchesRole;
  });

  const handleCopyPayload = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.details || {}, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const columns: Column<AuditLogEntry>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      cell: (log) => (
        <div className="space-y-0.5">
          <span className="font-mono text-[11px] text-slate-300 block">
            {new Date(log.timestamp).toLocaleDateString()}
          </span>
          <span className="font-mono text-[10px] text-slate-500 block">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
        </div>
      ),
    },
    {
      header: 'Audit Action',
      accessorKey: 'action',
      cell: (log) => (
        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold shadow-sm shadow-cyan-950/20">
          {log.action}
        </span>
      ),
    },
    {
      header: 'Actor & Role',
      accessorKey: 'userRole',
      cell: (log) => (
        <div className="space-y-1">
          <StatusBadge role={log.userRole} size="sm" />
          <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[130px]" title={log.userId}>
            ID: {log.userId}
          </span>
        </div>
      ),
    },
    {
      header: 'Target Resource',
      accessorKey: 'resource',
      cell: (log) => <span className="font-mono text-xs text-slate-200 font-medium">{log.resource}</span>,
    },
    {
      header: 'Payload Details',
      cell: (log) => (
        <button
          onClick={() => setSelectedLog(log)}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] flex items-center gap-1.5 transition-all border border-slate-700 hover:border-cyan-500/40"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Inspect Payload</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        breadcrumbs={['Administration', 'Audit Logs']}
        title="Reports & Authorized Audit History"
        description="Immutable system audit trail tracking all room allocations, status updates, room blockages, and M5 disruption recovery runs."
        badge="Immutable Compliance"
      />

      {error && <AlertBanner type="error" title="Error" message={error} />}

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5 mr-2">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Action Filter:</span>
          </span>

          <button
            onClick={() => setSelectedActionFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-mono transition-all ${
              selectedActionFilter === 'ALL'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            ALL ACTIONS ({auditLogs.length})
          </button>

          {actionsList.map((action) => (
            <button
              key={action}
              onClick={() => setSelectedActionFilter(action)}
              className={`px-3 py-1 rounded-xl text-xs font-mono transition-all ${
                selectedActionFilter === action
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {action}
            </button>
          ))}
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2 text-xs font-mono shrink-0">
          <span className="text-slate-400">Role:</span>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500/50"
          >
            <option value="ALL">All Roles</option>
            <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
            <option value="PRINCIPAL">PRINCIPAL</option>
            <option value="HOD">HOD</option>
            <option value="SECRETARY">SECRETARY</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label="Fetching authorized audit log trail..." />
      ) : (
        <DataTable
          columns={columns}
          data={filteredLogs}
          searchPlaceholder="Search action, actor, resource..."
          emptyMessage="No audit log entries matched criteria"
        />
      )}

      {/* Structured Payload Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <Code className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold text-white font-mono">{selectedLog.action}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Payload Inspection & Audit Metadata</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-950/80 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Key-Value Summary Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Log ID</span>
                <span className="text-slate-200 truncate block">{selectedLog.id}</span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Timestamp</span>
                <span className="text-slate-200">{new Date(selectedLog.timestamp).toLocaleString()}</span>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Actor Role</span>
                <StatusBadge role={selectedLog.userRole} size="sm" />
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-0.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Resource</span>
                <span className="text-cyan-400 font-bold truncate block">{selectedLog.resource}</span>
              </div>
            </div>

            {/* JSON Viewer with Copy Action */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 font-bold uppercase">Recorded Payload Details</span>
                <button
                  onClick={handleCopyPayload}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 bg-slate-950/90 border border-slate-800/80 rounded-2xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-56 leading-relaxed shadow-inner">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-xs font-mono text-slate-200 hover:bg-slate-700 transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
