"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AdminGuard from "@/components/AdminGuard";
import { adminApi } from "@/lib/api";
import { subscribeToAuditLogs } from "@/lib/websocket";
import type { AuditLogRecord, User } from "@/types";

function AdminLogsContent({ adminUser }: { adminUser: User }) {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [entityType, setEntityType] = useState("");
  const [error, setError] = useState("");

  const loadLogs = async (nextEntityType = entityType) => {
    try {
      const res = await adminApi.auditLogs({ limit: 150, entity_type: nextEntityType || undefined });
      setLogs(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load audit logs");
    }
  };

  useEffect(() => {
    loadLogs("");
    const unsub = subscribeToAuditLogs((event) => {
      setLogs((prev) => [event as AuditLogRecord, ...prev].slice(0, 200));
    });
    return () => {
      unsub();
    };
  }, []);

  return (
    <AppShell
      eyebrow="Admin"
      title="System Logs"
      subtitle={`Review the audit trail for admin actions, user changes, trade activity, and service operations.`}
      actions={
        <button onClick={() => loadLogs(entityType)} className="enterprise-button-secondary">
          Refresh Logs
        </button>
      }
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mb-6 surface-card p-6">
        <p className="app-kicker">Filter</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <input
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            placeholder="entity type: user, trade, system, service..."
            className="input-premium"
          />
          <button onClick={() => loadLogs(entityType)} className="enterprise-button-primary">
            Apply Filter
          </button>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Severity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString("en-US")}</td>
                <td className="font-semibold text-[#0b2a5b]">{log.action}</td>
                <td>
                  {log.entity_type}
                  {log.entity_id ? `:${log.entity_id}` : ""}
                </td>
                <td>{log.actor_user_id ?? "-"}</td>
                <td>{log.target_user_id ?? "-"}</td>
                <td className={log.severity === "warning" ? "status-neutral" : log.severity === "error" ? "status-negative" : "status-positive"}>
                  {log.severity}
                </td>
                <td>
                  <pre className="max-w-[28rem] whitespace-pre-wrap break-words font-mono text-xs text-slate-600">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export default function AdminLogsPage() {
  return <AdminGuard>{(adminUser) => <AdminLogsContent adminUser={adminUser} />}</AdminGuard>;
}
