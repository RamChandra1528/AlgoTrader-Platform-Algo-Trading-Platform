"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AdminGuard from "@/components/AdminGuard";
import { adminApi } from "@/lib/api";
import { subscribeToAdminMonitor, subscribeToSystemStatus, type SystemStatusEvent } from "@/lib/websocket";
import type { AdminMonitorEvent, AdminUserSummary, Strategy, User } from "@/types";

function AdminTradesContent({ adminUser }: { adminUser: User }) {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [systemState, setSystemState] = useState<SystemStatusEvent | null>(null);
  const [events, setEvents] = useState<AdminMonitorEvent[]>([]);
  const [overrideForm, setOverrideForm] = useState({
    user_id: 0,
    symbol: "AAPL",
    side: "buy",
    quantity: 1,
    strategy_id: 0,
    note: "Manual admin override",
  });
  const [strategyJson, setStrategyJson] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  const loadPageData = async () => {
    try {
      setError("");
      const [usersRes, strategiesRes, systemRes] = await Promise.all([
        adminApi.listUsers(),
        adminApi.listStrategies(),
        adminApi.systemStatus(),
      ]);
      setUsers(usersRes.data);
      setStrategies(strategiesRes.data);
      setSystemState(systemRes.data);
      if (!overrideForm.user_id && usersRes.data[0]) {
        setOverrideForm((prev) => ({ ...prev, user_id: usersRes.data[0].id }));
      }
      setStrategyJson(
        Object.fromEntries(
          strategiesRes.data.map((strategy: Strategy) => [strategy.id, JSON.stringify(strategy.parameters, null, 2)])
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load trading controls");
    }
  };

  useEffect(() => {
    loadPageData();
    const unsubEvents = subscribeToAdminMonitor((event) => {
      setEvents((prev) => [event, ...prev].slice(0, 30));
    });
    const unsubSystem = subscribeToSystemStatus((event) => {
      setSystemState(event);
    });
    return () => {
      unsubEvents();
      unsubSystem();
    };
  }, []);

  const runAction = async (action: () => Promise<unknown>) => {
    try {
      setError("");
      await action();
      await loadPageData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Trading control action failed");
    }
  };

  return (
    <AppShell
      eyebrow="Admin"
      title="Trade Monitor"
      subtitle={`Override signals, halt flows, force close positions, and tune strategy parameters from the admin trading desk.`}
      actions={
        <>
          <div className="enterprise-chip">
            {systemState?.trading_enabled ? "Global Trading Enabled" : "Global Trading Paused"}
          </div>
          <button
            onClick={() => runAction(() => adminApi.setGlobalTrading(!(systemState?.trading_enabled ?? true)))}
            className={(systemState?.trading_enabled ?? true) ? "enterprise-button-danger" : "enterprise-button-success"}
          >
            {(systemState?.trading_enabled ?? true) ? "Pause Global Trading" : "Resume Trading"}
          </button>
          <button
            onClick={() => {
              if (!window.confirm("Force close all open positions across the platform?")) {
                return;
              }
              runAction(() => adminApi.forceClose());
            }}
            className="enterprise-button-danger"
          >
            Force Close All
          </button>
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mb-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-card p-6">
          <p className="app-kicker">Signal Override</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Execute on behalf of a user</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">User</label>
              <select
                value={overrideForm.user_id}
                onChange={(e) => setOverrideForm({ ...overrideForm, user_id: Number(e.target.value) })}
                className="input-premium"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Symbol</label>
              <input
                value={overrideForm.symbol}
                onChange={(e) => setOverrideForm({ ...overrideForm, symbol: e.target.value.toUpperCase() })}
                className="input-premium"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Side</label>
              <select
                value={overrideForm.side}
                onChange={(e) => setOverrideForm({ ...overrideForm, side: e.target.value })}
                className="input-premium"
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Quantity</label>
              <input
                type="number"
                min="1"
                value={overrideForm.quantity}
                onChange={(e) => setOverrideForm({ ...overrideForm, quantity: Number(e.target.value) })}
                className="input-premium"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Note</label>
              <input
                value={overrideForm.note}
                onChange={(e) => setOverrideForm({ ...overrideForm, note: e.target.value })}
                className="input-premium"
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => runAction(() => adminApi.overrideSignal({
                user_id: overrideForm.user_id,
                symbol: overrideForm.symbol,
                side: overrideForm.side,
                quantity: overrideForm.quantity,
                strategy_id: overrideForm.strategy_id || undefined,
                note: overrideForm.note,
              }))}
              className="enterprise-button-primary"
            >
              Execute Override
            </button>
            <button
              onClick={() => runAction(() => adminApi.forceClose(overrideForm.user_id))}
              className="enterprise-button-secondary"
            >
              Force Close User Positions
            </button>
          </div>
        </div>

        <div className="surface-card-dark p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">Live Admin Feed</p>
          <div className="mt-5 space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-sky-50/75">Trade, user, and service events will appear here.</p>
            ) : (
              events.map((event, idx) => (
                <div key={`${event.timestamp}-${idx}`} className="rounded-sm border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-3">
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="app-kicker">Strategy Controls</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Modify strategy parameters</h2>
        </div>
        <div className="grid gap-6 p-6 xl:grid-cols-2">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="rounded-sm border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-[#0b2a5b]">{strategy.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    User {strategy.user_id} | {strategy.strategy_type}
                  </p>
                </div>
                <button
                  onClick={() => runAction(() => adminApi.updateStrategy(strategy.id, {
                    parameters: JSON.parse(strategyJson[strategy.id] || "{}"),
                    is_active: !strategy.is_active,
                  }))}
                  className={strategy.is_active ? "enterprise-button-secondary" : "enterprise-button-success"}
                >
                  {strategy.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
              <textarea
                value={strategyJson[strategy.id] || "{}"}
                onChange={(e) => setStrategyJson((prev) => ({ ...prev, [strategy.id]: e.target.value }))}
                className="input-premium mt-4 min-h-[180px] font-mono text-xs"
              />
              <button
                onClick={() => {
                  try {
                    const parameters = JSON.parse(strategyJson[strategy.id] || "{}");
                    runAction(() => adminApi.updateStrategy(strategy.id, { parameters, is_active: strategy.is_active }));
                  } catch {
                    setError(`Invalid JSON for strategy ${strategy.name}`);
                  }
                }}
                className="enterprise-button-primary mt-4"
              >
                Save Parameters
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export default function AdminTradesPage() {
  return <AdminGuard>{(adminUser) => <AdminTradesContent adminUser={adminUser} />}</AdminGuard>;
}
