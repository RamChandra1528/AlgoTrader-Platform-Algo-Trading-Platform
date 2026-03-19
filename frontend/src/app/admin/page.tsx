"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AdminGuard from "@/components/AdminGuard";
import { adminApi } from "@/lib/api";
import { subscribeToAdminMonitor, subscribeToSystemStatus, type SystemStatusEvent } from "@/lib/websocket";
import type { AdminDashboardSummary, AdminMonitorEvent, User } from "@/types";

const summaryCards = [
  { key: "total_users", label: "Total Users" },
  { key: "active_traders", label: "Active Traders" },
  { key: "total_trades_executed", label: "Trades Executed" },
];

function DashboardContent({ adminUser }: { adminUser: User }) {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [liveEvents, setLiveEvents] = useState<AdminMonitorEvent[]>([]);
  const [systemState, setSystemState] = useState<SystemStatusEvent | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");

  const loadSummary = async () => {
    try {
      setError("");
      const res = await adminApi.summary();
      setSummary(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load admin summary");
    }
  };

  useEffect(() => {
    loadSummary();
    const unsubMonitor = subscribeToAdminMonitor((event) => {
      setLiveEvents((prev) => [event, ...prev].slice(0, 25));
    });
    const unsubSystem = subscribeToSystemStatus((event) => {
      setSystemState(event);
      loadSummary();
    });
    return () => {
      unsubMonitor();
      unsubSystem();
    };
  }, []);

  const runAction = async (label: string, action: () => Promise<unknown>) => {
    try {
      setBusyAction(label);
      setError("");
      await action();
      await loadSummary();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to ${label}`);
    } finally {
      setBusyAction("");
    }
  };

  const effectiveSystem = systemState || (summary
    ? {
        system_running: summary.system_status === "running",
        trading_enabled: summary.trading_enabled,
        market_data_enabled: summary.market_data_enabled,
        global_stop_loss_limit: 0,
        default_max_trade_amount: 0,
        default_daily_loss_limit: 0,
        default_max_trades_per_day: 0,
        services: summary.services,
        timestamp: Date.now(),
      }
    : null);

  return (
    <AppShell
      eyebrow="Admin"
      title="Control Center"
      subtitle={`Full platform authority for ${adminUser.full_name}. Monitor users, trading, system health, and risk from one operational surface.`}
      actions={
        <>
          <div className="enterprise-chip">
            <span className={`h-2 w-2 rounded-full ${summary?.system_status === "running" ? "bg-green-500" : "bg-red-500"}`} />
            {summary?.system_status === "running" ? "System Running" : "System Stopped"}
          </div>
          <button
            onClick={() => runAction("toggle system", () => adminApi.setSystemRun(!(effectiveSystem?.system_running ?? true)))}
            className={(effectiveSystem?.system_running ?? true) ? "enterprise-button-danger" : "enterprise-button-success"}
            disabled={busyAction !== ""}
          >
            {(effectiveSystem?.system_running ?? true) ? "Stop System" : "Start System"}
          </button>
          <button
            onClick={() => runAction("toggle global trading", () => adminApi.setGlobalTrading(!(effectiveSystem?.trading_enabled ?? true)))}
            className={(effectiveSystem?.trading_enabled ?? true) ? "enterprise-button-danger" : "enterprise-button-success"}
            disabled={busyAction !== ""}
          >
            {(effectiveSystem?.trading_enabled ?? true) ? "Pause Trading" : "Resume Trading"}
          </button>
          <button
            onClick={() => runAction("toggle market data", () => adminApi.setMarketData(!(effectiveSystem?.market_data_enabled ?? true)))}
            className="enterprise-button-secondary"
            disabled={busyAction !== ""}
          >
            {(effectiveSystem?.market_data_enabled ?? true) ? "Disable Feed" : "Enable Feed"}
          </button>
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, idx) => (
          <div key={card.key} className={`stat-card animate-fade-in-up stagger-${Math.min(idx + 1, 4)}`}>
            <p className="enterprise-kpi">{card.label}</p>
            <p className="enterprise-value">
              {(summary?.[card.key as keyof AdminDashboardSummary] as number | undefined)?.toLocaleString() || "0"}
            </p>
          </div>
        ))}
        <div className="stat-card animate-fade-in-up stagger-4">
          <p className="enterprise-kpi">Platform Equity</p>
          <p className="enterprise-value">
            $
            {(summary?.platform_equity || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Realized {(summary?.platform_realized_pnl || 0) >= 0 ? "+" : ""}
            ${(summary?.platform_realized_pnl || 0).toFixed(2)} | Unrealized {(summary?.platform_unrealized_pnl || 0) >= 0 ? "+" : ""}
            ${(summary?.platform_unrealized_pnl || 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="app-kicker">Service Health</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Runtime status</h2>
          </div>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Status</th>
                <th>Message</th>
                <th>Restart</th>
              </tr>
            </thead>
            <tbody>
              {(summary?.services || []).map((service) => (
                <tr key={service.service_name}>
                  <td className="font-semibold text-[#0b2a5b]">{service.service_name}</td>
                  <td className={service.status === "running" ? "status-positive" : "status-neutral"}>{service.status}</td>
                  <td>{service.message || "Operational"}</td>
                  <td>
                    <button
                      onClick={() => runAction(`restart ${service.service_name}`, () => adminApi.restartService(service.service_name))}
                      className="enterprise-button-secondary px-3 py-2 text-xs"
                    >
                      Restart
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="surface-card-dark p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">Live Operations Feed</p>
          <div className="mt-5 space-y-3">
            {liveEvents.length === 0 ? (
              <p className="text-sm text-sky-50/70">Admin activity will stream here in real time.</p>
            ) : (
              liveEvents.map((event, idx) => (
                <div key={`${event.timestamp}-${idx}`} className="rounded-sm border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{event.message}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-sky-100/60">
                        {event.category} | {event.action}
                      </p>
                    </div>
                    <span className="text-xs text-sky-100/60">
                      {new Date(event.timestamp).toLocaleTimeString("en-US")}
                    </span>
                  </div>
                  {event.symbol || event.user_id ? (
                    <p className="mt-3 text-xs text-sky-50/75">
                      {event.symbol ? `Symbol ${event.symbol}` : ""} {event.user_id ? `User ${event.user_id}` : ""}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function AdminDashboardPage() {
  return <AdminGuard>{(adminUser) => <DashboardContent adminUser={adminUser} />}</AdminGuard>;
}
