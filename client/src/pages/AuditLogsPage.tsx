import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { AuditLogEntry } from '../types';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable, Column } from '../components/DataTable';
import { AlertBanner } from '../components/AlertBanner';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Eye, Code, X } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'SYSTEM_ADMIN';

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

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
      <div className="space-y-6">
        <PageHeader title="Authorized Audit Trail" badge="403 Forbidden" />
        <AlertBanner
          type="error"
          title="Access Denied (HTTP 403 Forbidden)"
          message={`Role '${role}' is not authorized to inspect security audit logs. Access is restricted exclusively to PRINCIPAL and SYSTEM_ADMIN roles.`}
        />
      </div>
    );
  }

  const columns: Column<AuditLogEntry>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'timestamp',
      cell: (log) => (
        <span className="font-mono text-[11px] text-slate-400">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: (log) => (
        <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
          {log.action}
        </span>
      ),
    },
    {
      header: 'Actor & Role',
      accessorKey: 'userRole',
      cell: (log) => (
        <div className="space-y-0.5">
          <StatusBadge role={log.userRole} />
          <span className="text-[10px] font-mono text-slate-500 block">{log.userId}</span>
        </div>
      ),
    },
    {
      header: 'Resource',
      accessorKey: 'resource',
      cell: (log) => <span className="font-mono text-xs text-white">{log.resource}</span>,
    },
    {
      header: 'Payload',
      cell: (log) => (
        <button
          onClick={() => setSelectedLog(log)}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] flex items-center gap-1.5 transition-colors"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>Inspect</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Authorized Audit History"
        description="Immutable system audit trail tracking all room allocations, status updates, room blockages, and algorithmic runs."
        badge="Audit Compliance"
      />

      {error && <AlertBanner type="error" title="Error" message={error} />}

      {isLoading ? (
        <LoadingSpinner label="Fetching audit log trail..." />
      ) : (
        <DataTable
          columns={columns}
          data={auditLogs}
          searchPlaceholder="Search action, user, resource..."
          emptyMessage="No audit log entries recorded"
        />
      )}

      {/* Payload Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400">
                <Code className="w-5 h-5" />
                <h3 className="text-base font-bold text-white font-mono">{selectedLog.action}</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Log Entry ID:</span>
                <span className="text-slate-200">{selectedLog.id}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Actor Role:</span>
                <StatusBadge role={selectedLog.userRole} />
              </div>
              <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Resource:</span>
                <span className="text-cyan-400">{selectedLog.resource}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono text-slate-400">Recorded Payload Details:</span>
              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto max-h-48">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-mono text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
