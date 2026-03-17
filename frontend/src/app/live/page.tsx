"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { isAuthenticated } from "@/lib/auth";
import { autoTradingApi } from "@/lib/api";
import { useTrading } from "@/components/Providers";

export default function LiveTradingPage() {
  const router = useRouter();
  const { account, botLogs, clearBotLogs } = useTrading();
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
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />

      <div className="flex-1 ml-64">
        <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50 sticky top-0 z-40">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Live Trading</h1>
              <p className="text-gray-500 text-sm">
                Status:{" "}
                <span className={running ? "text-green-400 font-semibold" : "text-gray-300 font-semibold"}>
                  {running ? "RUNNING" : "STOPPED"}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/autotrade")}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg transition text-sm font-medium border border-gray-700/50 hover:bg-gray-700"
              >
                Back
              </button>
              <button
                onClick={handleStop}
                disabled={!running}
                className="px-4 py-2 bg-red-600/20 text-red-300 rounded-lg transition text-sm font-medium border border-red-500/30 hover:bg-red-600/30 disabled:opacity-50"
              >
                Stop Live
              </button>
            </div>
          </div>
        </header>

        <main className="px-6 py-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-card p-4">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Equity</p>
              <p className="text-white font-bold text-xl">
                ${metrics.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Cash</p>
              <p className="text-white font-bold text-xl">
                ${metrics.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Realized PnL</p>
              <p className={`font-bold text-xl ${metrics.rpnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {metrics.rpnl >= 0 ? "+" : ""}${metrics.rpnl.toFixed(2)}
              </p>
            </div>
            <div className="glass-card p-4">
              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Unrealized PnL</p>
              <p className={`font-bold text-xl ${metrics.upnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {metrics.upnl >= 0 ? "+" : ""}${metrics.upnl.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-5">
              <h2 className="text-lg font-semibold text-white mb-3">Open Positions</h2>
              {(account?.positions?.length ?? 0) === 0 ? (
                <p className="text-gray-500 text-sm">No open positions</p>
              ) : (
                <div className="space-y-2">
                  {account!.positions.map((p) => (
                    <div key={p.id} className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold">{p.symbol}</p>
                          <p className="text-gray-500 text-xs">
                            Qty {p.quantity} • Avg ${p.avg_price.toFixed(2)} • Now ${p.current_price.toFixed(2)}
                          </p>
                        </div>
                        <div className={`font-bold ${p.unrealized_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {p.unrealized_pnl >= 0 ? "+" : ""}${p.unrealized_pnl.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">Live Bot Activity</h2>
                <button
                  onClick={clearBotLogs}
                  className="text-xs text-gray-400 hover:text-gray-200 transition"
                >
                  Clear
                </button>
              </div>
              {botLogs.length === 0 ? (
                <p className="text-gray-500 text-sm">No activity yet. Start Live to see ticks and actions.</p>
              ) : (
                <div className="max-h-[520px] overflow-y-auto space-y-2">
                  {botLogs.map((l, idx) => (
                    <div key={`${l.ts}-${idx}`} className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-semibold truncate">
                            {l.symbol ? `${l.symbol} • ` : ""}{l.event}
                          </p>
                          <p className="text-gray-400 text-xs break-words">{l.message}</p>
                        </div>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {new Date(l.ts).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

