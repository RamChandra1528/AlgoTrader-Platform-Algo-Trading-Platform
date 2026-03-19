"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AdminGuard from "@/components/AdminGuard";
import { adminApi } from "@/lib/api";
import type { AdminUserSummary, PlatformControlState, User } from "@/types";

function AdminRiskContent({ adminUser }: { adminUser: User }) {
  const [settings, setSettings] = useState<PlatformControlState | null>(null);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const [riskRes, usersRes] = await Promise.all([adminApi.risk(), adminApi.listUsers()]);
      setSettings(riskRes.data);
      setUsers(usersRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load risk settings");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateUserField = (userId: number, field: keyof AdminUserSummary, value: number) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, [field]: value } : user))
    );
  };

  const saveUser = async (user: AdminUserSummary) => {
    try {
      setError("");
      await adminApi.updateUser(user.id, {
        max_trade_amount: user.max_trade_amount,
        daily_loss_limit: user.daily_loss_limit,
        max_trades_per_day: user.max_trades_per_day,
      });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to save user risk settings");
    }
  };

  return (
    <AppShell
      eyebrow="Admin"
      title="Risk Settings"
      subtitle={`Control platform-wide and per-user risk thresholds, limits, and trade volume caps for ${adminUser.full_name}.`}
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="mb-6 surface-card p-6">
        <p className="app-kicker">Global Controls</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Platform defaults</h2>
        {settings ? (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Global Stop-Loss Limit
                </label>
                <input
                  type="number"
                  value={settings.global_stop_loss_limit}
                  onChange={(e) => setSettings({ ...settings, global_stop_loss_limit: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Default Max Trade
                </label>
                <input
                  type="number"
                  value={settings.default_max_trade_amount}
                  onChange={(e) => setSettings({ ...settings, default_max_trade_amount: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Default Daily Loss
                </label>
                <input
                  type="number"
                  value={settings.default_daily_loss_limit}
                  onChange={(e) => setSettings({ ...settings, default_daily_loss_limit: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Default Trades / Day
                </label>
                <input
                  type="number"
                  value={settings.default_max_trades_per_day}
                  onChange={(e) => setSettings({ ...settings, default_max_trades_per_day: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  setError("");
                  await adminApi.updateRisk({
                    global_stop_loss_limit: settings.global_stop_loss_limit,
                    default_max_trade_amount: settings.default_max_trade_amount,
                    default_daily_loss_limit: settings.default_daily_loss_limit,
                    default_max_trades_per_day: settings.default_max_trades_per_day,
                  });
                  await loadData();
                } catch (err: any) {
                  setError(err.response?.data?.detail || "Failed to update platform risk");
                }
              }}
              className="enterprise-button-primary mt-5"
            >
              Save Global Risk Settings
            </button>
          </>
        ) : null}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="app-kicker">Per-User Risk</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Limit matrix</h2>
        </div>
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Max Trade Amount</th>
              <th>Daily Loss Limit</th>
              <th>Trades / Day</th>
              <th>Save</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <div>
                    <p className="font-semibold text-[#0b2a5b]">{user.full_name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                </td>
                <td>
                  <input
                    type="number"
                    value={user.max_trade_amount}
                    onChange={(e) => updateUserField(user.id, "max_trade_amount", Number(e.target.value))}
                    className="input-premium"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={user.daily_loss_limit}
                    onChange={(e) => updateUserField(user.id, "daily_loss_limit", Number(e.target.value))}
                    className="input-premium"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={user.max_trades_per_day}
                    onChange={(e) => updateUserField(user.id, "max_trades_per_day", Number(e.target.value))}
                    className="input-premium"
                  />
                </td>
                <td>
                  <button onClick={() => saveUser(user)} className="enterprise-button-secondary">
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

export default function AdminRiskPage() {
  return <AdminGuard>{(adminUser) => <AdminRiskContent adminUser={adminUser} />}</AdminGuard>;
}
