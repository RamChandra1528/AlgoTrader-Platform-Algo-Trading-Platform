"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { isAuthenticated } from "@/lib/auth";
import { autoTradingApi } from "@/lib/api";
import { useTrading } from "@/components/Providers";

interface Recommendation {
  symbol: string;
  current_price: number;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasons: string[];
  indicators: {
    sma_10: number;
    sma_30: number;
    rsi_14: number;
  };
}

interface ExecutionResult {
  symbol: string;
  action: string;
  quantity: number;
  price: number;
  allocated_amount: number;
  status: string;
  detail: string;
}

export default function AutoTrade() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState("");
  const [budget, setBudget] = useState(10000);
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveConfig, setLiveConfig] = useState({
    profit_target_pct: 0.03,
    stop_loss_pct: 0.02,
    budget_per_trade: 2000,
    max_positions: 5,
    loop_interval_sec: 10,
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [results, setResults] = useState<{
    executed_trades: ExecutionResult[];
    total_spent: number;
    budget_remaining: number;
  } | null>(null);
  const { account } = useTrading();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await autoTradingApi.liveStatus();
        setLiveRunning(Boolean(res.data?.running));
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setError("");
    setResults(null);
    try {
      const res = await autoTradingApi.scan();
      setRecommendations(res.data.recommendations);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to scan market");
    } finally {
      setScanning(false);
    }
  };

  const handleExecute = async () => {
    if (budget <= 0) {
      setError("Please enter a valid budget");
      return;
    }

    setExecuting(true);
    setError("");
    try {
      const res = await autoTradingApi.execute({ budget });
      setResults(res.data);
      handleScan();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Auto-execution failed");
    } finally {
      setExecuting(false);
    }
  };

  const handleLiveStart = async () => {
    setError("");
    try {
      await autoTradingApi.liveStart(liveConfig);
      setLiveRunning(true);
      router.push("/live");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to start live auto-trader");
    }
  };

  const handleLiveStop = async () => {
    setError("");
    try {
      await autoTradingApi.liveStop();
      setLiveRunning(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to stop live auto-trader");
    }
  };

  const getSignalPill = (signal: string) => {
    switch (signal) {
      case "BUY":
        return "border-green-200 bg-green-50 text-green-700";
      case "SELL":
        return "border-red-200 bg-red-50 text-red-700";
      default:
        return "border-amber-200 bg-amber-50 text-amber-700";
    }
  };

  return (
    <AppShell
      eyebrow="Automation"
      title="Auto Trade"
      subtitle="Scan the market, rank opportunities, execute the strongest signals, and manage live auto-trading controls."
      actions={
        <>
          <div className="enterprise-chip">
            Equity $
            {((account?.equity ?? 0) || 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <button
            onClick={liveRunning ? handleLiveStop : handleLiveStart}
            className={liveRunning ? "enterprise-button-danger" : "enterprise-button-success"}
          >
            {liveRunning ? "Stop Live" : "Start Live"}
          </button>
          {recommendations.length > 0 ? (
            <button
              onClick={handleExecute}
              disabled={executing || scanning}
              className="enterprise-button-primary"
            >
              {executing ? "Executing..." : "Auto-Execute Top Signals"}
            </button>
          ) : null}
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="surface-card mb-8 p-6">
        <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="app-kicker">Configuration</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">
              Configure auto-trader
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Set your budget and the system will scan popular tech stocks, evaluate MA crossover and RSI indicators,
              and rank the strongest buy candidates for execution.
            </p>

            <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Trading budget ($)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="input-premium text-lg font-semibold"
                  min="100"
                  step="100"
                />
              </div>
              <button
                onClick={handleScan}
                disabled={scanning || executing}
                className="enterprise-button-primary h-[50px] px-6"
              >
                {scanning ? "Scanning..." : "Scan Market"}
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Profit Target (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={liveConfig.profit_target_pct}
                  onChange={(e) => setLiveConfig({ ...liveConfig, profit_target_pct: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Stop Loss (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={liveConfig.stop_loss_pct}
                  onChange={(e) => setLiveConfig({ ...liveConfig, stop_loss_pct: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Budget / Trade
                </label>
                <input
                  type="number"
                  value={liveConfig.budget_per_trade}
                  onChange={(e) => setLiveConfig({ ...liveConfig, budget_per_trade: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Max Positions
                </label>
                <input
                  type="number"
                  value={liveConfig.max_positions}
                  onChange={(e) => setLiveConfig({ ...liveConfig, max_positions: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Loop (sec)
                </label>
                <input
                  type="number"
                  value={liveConfig.loop_interval_sec}
                  onChange={(e) => setLiveConfig({ ...liveConfig, loop_interval_sec: Number(e.target.value) })}
                  className="input-premium"
                />
              </div>
            </div>
          </div>

          <div className="surface-card-dark p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">How it works</p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-sky-50/80">
              <div className="flex gap-3">
                <span className="font-semibold text-cyan-300">1.</span>
                <p>System scans 15 popular high-volume stocks.</p>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-cyan-300">2.</span>
                <p>Calculates 10/30 SMA and 14-day RSI for each candidate.</p>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-cyan-300">3.</span>
                <p>Generates BUY, SELL, or HOLD signals based on technical confluence.</p>
              </div>
              <div className="flex gap-3">
                <span className="font-semibold text-cyan-300">4.</span>
                <p>Auto-execution buys the top BUY signals while distributing budget under the configured rules.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {results ? (
        <div className="mb-8 animate-fade-in-up">
          <div className="mb-4">
            <p className="app-kicker">Execution results</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Latest allocation run</h2>
          </div>

          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <div className="stat-card">
              <p className="enterprise-kpi">Trades Executed</p>
              <p className="enterprise-value">
                {results.executed_trades.filter((t) => t.status === "success").length}
              </p>
            </div>
            <div className="stat-card">
              <p className="enterprise-kpi">Total Allocated</p>
              <p className="enterprise-value status-positive">
                $
                {results.total_spent.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="stat-card">
              <p className="enterprise-kpi">Budget Remaining</p>
              <p className="enterprise-value">
                $
                {results.budget_remaining.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.executed_trades.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-slate-500">
                      No trades were executed.
                    </td>
                  </tr>
                ) : (
                  results.executed_trades.map((trade, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold capitalize text-[#0b2a5b]">{trade.action}</td>
                      <td className="font-semibold text-[#0b2a5b]">{trade.symbol}</td>
                      <td>{trade.quantity}</td>
                      <td>${trade.price.toFixed(2)}</td>
                      <td>
                        $
                        {trade.allocated_amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className={`text-xs font-semibold uppercase tracking-[0.18em] ${trade.status === "success" ? "status-positive" : "status-negative"}`}>
                            {trade.status}
                          </span>
                          <span className="mt-1 text-xs text-slate-500">{trade.detail}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {recommendations.length > 0 ? (
        <div className="animate-fade-in-up">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="app-kicker">Market scan</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Scan results</h2>
            </div>
            <div className="enterprise-chip">
              Buy Signals {recommendations.filter((r) => r.signal === "BUY").length}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((rec, idx) => (
              <div
                key={rec.symbol}
                className={`surface-card p-5 animate-fade-in-up stagger-${Math.min(idx + 1, 4)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[#0b2a5b]">{rec.symbol}</h3>
                    <p className="mt-1 text-sm text-slate-500">${rec.current_price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getSignalPill(rec.signal)}`}>
                      {rec.signal}
                    </span>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      Confidence{" "}
                      <span
                        className={
                          rec.confidence > 60
                            ? "status-positive"
                            : rec.confidence < 40
                              ? "status-negative"
                              : "status-neutral"
                        }
                      >
                        {rec.confidence}%
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 rounded-sm border border-slate-200 bg-slate-50 p-3">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">SMA-10</p>
                    <p className="mt-1 text-sm font-semibold text-[#0b2a5b]">${rec.indicators.sma_10}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">SMA-30</p>
                    <p className="mt-1 text-sm font-semibold text-[#0b2a5b]">${rec.indicators.sma_30}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">RSI-14</p>
                    <p
                      className={`mt-1 text-sm font-semibold ${
                        rec.indicators.rsi_14 > 70
                          ? "status-negative"
                          : rec.indicators.rsi_14 < 30
                            ? "status-positive"
                            : "text-[#0b2a5b]"
                      }`}
                    >
                      {rec.indicators.rsi_14}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="enterprise-kpi mb-2">Signals</p>
                  <ul className="space-y-2">
                    {rec.reasons.map((reason, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600">
                        <span className="text-[#007cc3]">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
