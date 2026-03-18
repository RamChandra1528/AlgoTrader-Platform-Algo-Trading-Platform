"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "@/components/AppShell";
import { isAuthenticated } from "@/lib/auth";
import { autoTradingApi } from "@/lib/api";
import { useTrading } from "@/components/Providers";

export default function LiveTradingPage() {
  const router = useRouter();
  const { account, botLogs, clearBotLogs, tradeTape, clearTradeTape, equitySeries } = useTrading();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const res = await autoTradingApi.liveStatus();
        setRunning(Boolean(res.data?.running));
      } catch {
        // ignore
      }
    })();
  }, [router]);

  const metrics = useMemo(() => {
    const equity = account?.equity ?? 0;
    const cash = account?.cash_balance ?? 0;
    const upnl = account?.unrealized_pnl ?? 0;
    const rpnl = account?.realized_pnl ?? 0;
    return { equity, cash, upnl, rpnl };
  }, [account]);

  const handleStop = async () => {
    setError("");
    try {
      await autoTradingApi.liveStop();
      setRunning(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to stop live auto-trader");
    }
  };

  return (
    <AppShell
      eyebrow="Live operations"
      title="Live Trading"
      subtitle={`Status: ${running ? "RUNNING" : "STOPPED"}. Monitor live equity, fills, open positions, and bot activity.`}
      actions={
        <>
          <button onClick={() => router.push("/autotrade")} className="enterprise-button-secondary">
            Back
          </button>
          <button onClick={handleStop} disabled={!running} className="enterprise-button-danger">
            Stop Live
          </button>
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="stat-card">
          <p className="enterprise-kpi">Equity</p>
          <p className="enterprise-value">
            ${metrics.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="stat-card">
          <p className="enterprise-kpi">Cash</p>
          <p className="enterprise-value">
            ${metrics.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="stat-card">
          <p className="enterprise-kpi">Realized P&amp;L</p>
          <p className={`enterprise-value ${metrics.rpnl >= 0 ? "status-positive" : "status-negative"}`}>
            {metrics.rpnl >= 0 ? "+" : ""}${metrics.rpnl.toFixed(2)}
          </p>
        </div>
        <div className="stat-card">
          <p className="enterprise-kpi">Unrealized P&amp;L</p>
          <p className={`enterprise-value ${metrics.upnl >= 0 ? "status-positive" : "status-negative"}`}>
            {metrics.upnl >= 0 ? "+" : ""}${metrics.upnl.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="surface-card p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="app-kicker">Live equity</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Equity curve</h2>
            </div>
            <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
              {equitySeries.length > 0 ? `${equitySeries.length} pts` : "Waiting for updates"}
            </span>
          </div>
          <div className="h-[320px] rounded-sm border border-slate-200 bg-[#f7fbff] p-3">
            {equitySeries.length < 2 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No equity updates yet. Start Live and wait a few seconds.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={equitySeries.map((p) => ({
                    time: new Date(p.ts).toLocaleTimeString(),
                    equity: p.equity,
                  }))}
                >
                  <XAxis dataKey="time" tick={{ fill: "#5f738a", fontSize: 10 }} hide />
                  <YAxis tick={{ fill: "#5f738a", fontSize: 10 }} width={50} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid #d8e3ee",
                      borderRadius: 4,
                      color: "#11263f",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#5f738a" }}
                  />
                  <Line type="monotone" dataKey="equity" stroke="#007cc3" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {account?.last_trade ? (
            <div className="mt-4 text-sm text-slate-500">
              Last trade:{" "}
              <span className="font-semibold text-[#0b2a5b]">
                {account.last_trade.side.toUpperCase()} {account.last_trade.quantity} {account.last_trade.symbol} @ $
                {account.last_trade.price.toFixed(2)}
              </span>{" "}
              | P&amp;L:{" "}
              <span className={account.last_trade.pnl >= 0 ? "status-positive" : "status-negative"}>
                {account.last_trade.pnl >= 0 ? "+" : ""}${account.last_trade.pnl.toFixed(2)}
              </span>
            </div>
          ) : null}
        </div>

        <div className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="app-kicker">Live fills</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Trades</h2>
            </div>
            <button onClick={clearTradeTape} className="enterprise-button-secondary px-3 py-2">
              Clear
            </button>
          </div>
          {tradeTape.length === 0 ? (
            <p className="text-sm text-slate-500">
              No fills yet. When the bot auto-buys or sells, trades will appear here instantly.
            </p>
          ) : (
            <div className="space-y-3">
              {tradeTape.map((t, idx) => (
                <div key={`${t.id}-${idx}`} className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0b2a5b]">
                        <span className={t.side === "buy" ? "status-positive" : "status-negative"}>
                          {t.side === "buy" ? "BUY" : "SELL"}
                        </span>{" "}
                        {t.symbol}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t.quantity} @ ${Number(t.price).toFixed(2)} | {t.status}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      {new Date(t.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="surface-card p-6">
          <div className="mb-4">
            <p className="app-kicker">Current book</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Open positions</h2>
          </div>
          {(account?.positions?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500">No open positions.</p>
          ) : (
            <div className="space-y-3">
              {account!.positions.map((p) => (
                <div key={p.id} className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-[#0b2a5b]">{p.symbol}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Qty {p.quantity} | Avg ${p.avg_price.toFixed(2)} | Now ${p.current_price.toFixed(2)}
                      </p>
                    </div>
                    <div className={`text-lg font-semibold ${p.unrealized_pnl >= 0 ? "status-positive" : "status-negative"}`}>
                      {p.unrealized_pnl >= 0 ? "+" : ""}${p.unrealized_pnl.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="app-kicker">Bot stream</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Live bot activity</h2>
            </div>
            <button onClick={clearBotLogs} className="enterprise-button-secondary px-3 py-2">
              Clear
            </button>
          </div>
          {botLogs.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet. Start Live to see ticks and actions.</p>
          ) : (
            <div className="space-y-3">
              {botLogs.map((l, idx) => (
                <div key={`${l.ts}-${idx}`} className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#0b2a5b]">
                        {l.symbol ? `${l.symbol} | ` : ""}
                        {l.event}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-500">{l.message}</p>
                    </div>
                    <span className="whitespace-nowrap text-[11px] uppercase tracking-[0.16em] text-slate-400">
                      {new Date(l.ts).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
