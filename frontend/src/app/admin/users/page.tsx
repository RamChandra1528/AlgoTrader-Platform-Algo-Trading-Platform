"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AdminGuard from "@/components/AdminGuard";
import { adminApi } from "@/lib/api";
import type { AccountSnapshot } from "@/lib/websocket";
import type { AdminUserSummary, Trade, User } from "@/types";

function AdminUsersContent({ adminUser }: { adminUser: User }) {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [portfolio, setPortfolio] = useState<AccountSnapshot | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [limits, setLimits] = useState({
    max_trade_amount: 0,
    daily_loss_limit: 0,
    max_trades_per_day: 0,
  });
  const [error, setError] = useState("");

  const loadUserDetail = async (userId: number) => {
    try {
      const [portfolioRes, tradesRes] = await Promise.all([
        adminApi.userPortfolio(userId),
        adminApi.userTrades(userId, 30),
      ]);
      setPortfolio(portfolioRes.data);
      setTrades(tradesRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load user detail");
    }
  };

  const loadUsers = async (preferredUserId?: number) => {
    try {
      const res = await adminApi.listUsers();
      const nextUsers = res.data;
      setUsers(nextUsers);
      const picked =
        nextUsers.find((user: AdminUserSummary) => user.id === (preferredUserId || selectedUser?.id)) || nextUsers[0] || null;
      setSelectedUser(picked);
      if (picked) {
        setLimits({
          max_trade_amount: picked.max_trade_amount,
          daily_loss_limit: picked.daily_loss_limit,
          max_trades_per_day: picked.max_trades_per_day,
        });
        await loadUserDetail(picked.id);
      } else {
        setPortfolio(null);
        setTrades([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load users");
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const refreshAndKeep = async (userId: number) => {
    await loadUsers(userId);
  };

  const handleSelect = async (user: AdminUserSummary) => {
    setSelectedUser(user);
    setLimits({
      max_trade_amount: user.max_trade_amount,
      daily_loss_limit: user.daily_loss_limit,
      max_trades_per_day: user.max_trades_per_day,
    });
    await loadUserDetail(user.id);
  };

  const handleUserAction = async (action: () => Promise<unknown>, userId?: number) => {
    try {
      setError("");
      await action();
      await refreshAndKeep(userId || selectedUser?.id || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Admin action failed");
    }
  };

  return (
    <AppShell
      eyebrow="Admin"
      title="User Management"
      subtitle={`Review every account, pause trading, reset balances, and inspect user portfolios as ${adminUser.full_name}.`}
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="surface-card overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="app-kicker">Accounts</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">All platform users</h2>
          </div>
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Balance</th>
                <th>Trades</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={selectedUser?.id === user.id ? "bg-sky-50" : ""}
                  onClick={() => handleSelect(user)}
                >
                  <td>
                    <div>
                      <p className="font-semibold text-[#0b2a5b]">{user.full_name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </td>
                  <td className="uppercase">{user.role}</td>
                  <td>${user.cash_balance.toFixed(2)}</td>
                  <td>{user.total_trades}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${user.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${user.is_trading_enabled ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>
                        {user.is_trading_enabled ? "Trading On" : "Trading Paused"}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="surface-card p-6">
            <p className="app-kicker">Selected User</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">
              {selectedUser?.full_name || "No user selected"}
            </h2>
            {selectedUser ? (
              <>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {selectedUser.email} | Role {selectedUser.role.toUpperCase()} | Open positions {selectedUser.open_positions}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => handleUserAction(() => adminApi.updateUser(selectedUser.id, { is_active: !selectedUser.is_active }), selectedUser.id)}
                    className={selectedUser.is_active ? "enterprise-button-danger" : "enterprise-button-success"}
                  >
                    {selectedUser.is_active ? "Deactivate User" : "Activate User"}
                  </button>
                  <button
                    onClick={() => handleUserAction(() => adminApi.pauseUserTrading(selectedUser.id, !selectedUser.is_trading_enabled), selectedUser.id)}
                    className="enterprise-button-secondary"
                  >
                    {selectedUser.is_trading_enabled ? "Pause Trading" : "Resume Trading"}
                  </button>
                  <button
                    onClick={() => {
                      const value = window.prompt("Reset balance to amount", "100000");
                      if (!value) {
                        return;
                      }
                      handleUserAction(() => adminApi.resetUserBalance(selectedUser.id, Number(value)), selectedUser.id);
                    }}
                    className="enterprise-button-secondary"
                  >
                    Reset Balance
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm(`Delete ${selectedUser.email}? This cannot be undone.`)) {
                        return;
                      }
                      handleUserAction(() => adminApi.deleteUser(selectedUser.id), users.find((user) => user.id !== selectedUser.id)?.id);
                    }}
                    className="enterprise-button-danger"
                  >
                    Delete User
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Max Trade Amount
                    </label>
                    <input
                      type="number"
                      value={limits.max_trade_amount}
                      onChange={(e) => setLimits({ ...limits, max_trade_amount: Number(e.target.value) })}
                      className="input-premium"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Daily Loss Limit
                    </label>
                    <input
                      type="number"
                      value={limits.daily_loss_limit}
                      onChange={(e) => setLimits({ ...limits, daily_loss_limit: Number(e.target.value) })}
                      className="input-premium"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Max Trades / Day
                    </label>
                    <input
                      type="number"
                      value={limits.max_trades_per_day}
                      onChange={(e) => setLimits({ ...limits, max_trades_per_day: Number(e.target.value) })}
                      className="input-premium"
                    />
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleUserAction(
                      () => adminApi.updateUser(selectedUser.id, limits),
                      selectedUser.id,
                    )
                  }
                  className="enterprise-button-primary mt-4"
                >
                  Save Limits
                </button>
              </>
            ) : null}
          </div>

          <div className="surface-card p-6">
            <p className="app-kicker">Portfolio</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Account snapshot</h2>
            {portfolio ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="enterprise-metric">
                    <p className="enterprise-kpi">Cash</p>
                    <p className="enterprise-value">${portfolio.cash_balance.toFixed(2)}</p>
                  </div>
                  <div className="enterprise-metric">
                    <p className="enterprise-kpi">Equity</p>
                    <p className="enterprise-value">${portfolio.equity.toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <p className="enterprise-kpi mb-3">Open positions</p>
                  <div className="space-y-3">
                    {portfolio.positions.length === 0 ? (
                      <p className="text-sm text-slate-500">No open positions.</p>
                    ) : (
                      portfolio.positions.map((position) => (
                        <div key={position.id} className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <p className="font-semibold text-[#0b2a5b]">{position.symbol}</p>
                            <p className={position.unrealized_pnl >= 0 ? "status-positive" : "status-negative"}>
                              ${position.unrealized_pnl.toFixed(2)}
                            </p>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">
                            Qty {position.quantity} | Avg ${position.avg_price.toFixed(2)} | Current ${position.current_price.toFixed(2)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Select a user to inspect portfolio data.</p>
            )}
          </div>

          <div className="surface-card p-6">
            <p className="app-kicker">Trade History</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Recent activity</h2>
            <div className="mt-4 space-y-3">
              {trades.length === 0 ? (
                <p className="text-sm text-slate-500">No trades recorded for this user.</p>
              ) : (
                trades.slice(0, 8).map((trade) => (
                  <div key={trade.id} className="rounded-sm border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-[#0b2a5b]">
                        {trade.side.toUpperCase()} {trade.symbol}
                      </p>
                      <span className={trade.pnl >= 0 ? "status-positive" : "status-negative"}>
                        ${trade.pnl.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Qty {trade.quantity} @ ${trade.price.toFixed(2)} | {trade.source || "manual"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function AdminUsersPage() {
  return <AdminGuard>{(adminUser) => <AdminUsersContent adminUser={adminUser} />}</AdminGuard>;
}
