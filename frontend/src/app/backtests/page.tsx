"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageLoader from "@/components/PageLoader";
import { isAuthenticated } from "@/lib/auth";
import { backtestsApi, strategiesApi } from "@/lib/api";
import { useTrading } from "@/components/Providers";

interface Strategy {
  id: number;
  name: string;
  strategy_type: string;
}

interface Backtest {
  id: number;
  strategy_id: number;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_value: number;
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  equity_curve: { date: string; value: number }[];
  created_at: string;
}

export default function Backtests() {
  const router = useRouter();
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedBacktest, setSelectedBacktest] = useState<Backtest | null>(null);
  const { setAccount } = useTrading();
  const [simulating, setSimulating] = useState(false);
  const [formData, setFormData] = useState({
    strategy_id: "",
    symbol: "AAPL",
    start_date: "2023-01-01",
    end_date: "2024-01-01",
    initial_capital: 100000,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [backtestsRes, strategiesRes] = await Promise.all([
        backtestsApi.list().catch(() => ({ data: [] })),
        strategiesApi.list().catch(() => ({ data: [] })),
      ]);
      setBacktests(backtestsRes.data || []);
      setStrategies(strategiesRes.data || []);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.strategy_id) {
      setError("Please select a strategy");
      return;
    }
    setError("");
    try {
      setRunning(true);
      const res = await backtestsApi.run({
        strategy_id: parseInt(formData.strategy_id),
        symbol: formData.symbol.toUpperCase(),
        start_date: formData.start_date,
        end_date: formData.end_date,
        initial_capital: formData.initial_capital,
      });
      setShowForm(false);
      loadData();
      if (res.data) setSelectedBacktest(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Backtest failed");
    } finally {
      setRunning(false);
    }
  };

  const getStrategyName = (id: number) => {
    return strategies.find((s) => s.id === id)?.name || "Unknown";
  };

  const simulateBacktest = async (bt: Backtest) => {
    if (!bt.equity_curve || bt.equity_curve.length < 2) return;
    setSimulating(true);
    try {
      for (let i = 0; i < bt.equity_curve.length; i++) {
        const p = bt.equity_curve[i];
        const equity = p.value;
        setAccount({
          starting_balance: bt.initial_capital,
          cash_balance: equity,
          market_value: 0,
          equity,
          realized_pnl: equity - bt.initial_capital,
          unrealized_pnl: 0,
          positions: [],
          timestamp: Date.now(),
        });
        await new Promise((r) => setTimeout(r, 80));
      }
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading backtests" />;
  }

  return (
    <AppShell
      eyebrow="Validation"
      title="Backtests"
      subtitle={`${backtests.length} backtests completed. Compare outcomes, inspect equity curves, and replay historical performance into the live account view.`}
      actions={
        <button
          onClick={() => {
            setShowForm(!showForm);
            setSelectedBacktest(null);
          }}
          className={showForm ? "enterprise-button-secondary" : "enterprise-button-primary"}
        >
          {showForm ? "Cancel" : "Run Backtest"}
        </button>
      }
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {showForm ? (
        <div className="surface-card mb-6 p-6 animate-fade-in-up">
          <p className="app-kicker">New backtest</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">
            Configure historical simulation.
          </h2>
          {strategies.length === 0 ? (
            <div className="mt-6 rounded-sm border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-base font-semibold text-[#0b2a5b]">You need a strategy first</p>
              <p className="mt-2 text-sm text-slate-500">Create one before running a backtest.</p>
              <button onClick={() => router.push("/strategies")} className="enterprise-button-primary mt-5">
                Create Strategy
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Strategy</label>
                  <select
                    required
                    value={formData.strategy_id}
                    onChange={(e) => setFormData({ ...formData, strategy_id: e.target.value })}
                    className="input-premium"
                  >
                    <option value="">Select a strategy</option>
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.strategy_type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Symbol</label>
                  <input
                    type="text"
                    required
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="input-premium"
                    placeholder="AAPL"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Start date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">End date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Initial capital</label>
                  <input
                    type="number"
                    required
                    value={formData.initial_capital}
                    onChange={(e) =>
                      setFormData({ ...formData, initial_capital: parseInt(e.target.value) || 100000 })
                    }
                    className="input-premium"
                  />
                </div>
              </div>

              <button type="submit" disabled={running} className="enterprise-button-primary w-full">
                {running ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running backtest...
                  </span>
                ) : (
                  "Run Backtest"
                )}
              </button>
            </form>
          )}
        </div>
      ) : null}

      {selectedBacktest ? (
        <div className="surface-card mb-6 p-6 animate-fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="app-kicker">Selected result</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">
                {selectedBacktest.symbol} - {getStrategyName(selectedBacktest.strategy_id)}
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={simulating}
                onClick={() => simulateBacktest(selectedBacktest)}
                className="enterprise-button-secondary"
              >
                {simulating ? "Simulating..." : "Simulate Live Updates"}
              </button>
              <button onClick={() => setSelectedBacktest(null)} className="enterprise-button-danger">
                Close
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="enterprise-metric">
              <p className="enterprise-kpi">Initial Capital</p>
              <p className="enterprise-value">${selectedBacktest.initial_capital.toLocaleString()}</p>
            </div>
            <div className="enterprise-metric">
              <p className="enterprise-kpi">Final Value</p>
              <p
                className={`enterprise-value ${
                  selectedBacktest.final_value >= selectedBacktest.initial_capital
                    ? "status-positive"
                    : "status-negative"
                }`}
              >
                ${selectedBacktest.final_value.toLocaleString()}
              </p>
            </div>
            <div className="enterprise-metric">
              <p className="enterprise-kpi">Return</p>
              <p
                className={`enterprise-value ${
                  selectedBacktest.total_return >= 0 ? "status-positive" : "status-negative"
                }`}
              >
                {selectedBacktest.total_return >= 0 ? "+" : ""}
                {selectedBacktest.total_return.toFixed(2)}%
              </p>
            </div>
            <div className="enterprise-metric">
              <p className="enterprise-kpi">Sharpe Ratio</p>
              <p className="enterprise-value">{selectedBacktest.sharpe_ratio.toFixed(4)}</p>
            </div>
            <div className="enterprise-metric">
              <p className="enterprise-kpi">Max Drawdown</p>
              <p className="enterprise-value status-negative">{selectedBacktest.max_drawdown.toFixed(2)}%</p>
            </div>
          </div>

          {selectedBacktest.equity_curve && selectedBacktest.equity_curve.length > 1 ? (
            <div className="mt-6">
              <p className="enterprise-kpi mb-3">Equity Curve</p>
              <div className="rounded-sm border border-slate-200 bg-[#f7fbff] p-4">
                <svg viewBox="0 0 800 200" className="w-full">
                  {(() => {
                    const curve = selectedBacktest.equity_curve;
                    const values = curve.map((p) => p.value);
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const range = max - min || 1;
                    const isProfit = values[values.length - 1] >= values[0];
                    const color = isProfit ? "#15803d" : "#b42318";

                    const points = curve.map((p, i) => {
                      const x = (i / (curve.length - 1)) * 780 + 10;
                      const y = 190 - ((p.value - min) / range) * 180;
                      return `${x},${y}`;
                    });

                    const areaPoints = [...points, "790,190", "10,190"];

                    return (
                      <>
                        <defs>
                          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                            <stop offset="100%" stopColor={color} stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <polygon points={areaPoints.join(" ")} fill="url(#equityGrad)" />
                        <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                      </>
                    );
                  })()}
                </svg>
                <div className="mt-2 flex justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span>{selectedBacktest.start_date}</span>
                  <span>{selectedBacktest.end_date}</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {backtests.length === 0 ? (
        <div className="enterprise-empty">
          <p className="text-xl font-semibold text-[#0b2a5b]">No backtests yet</p>
          <p className="mt-2 text-sm text-slate-500">Run your first backtest to see strategy performance.</p>
          <button onClick={() => setShowForm(true)} className="enterprise-button-primary mt-6">
            Run Backtest
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {backtests.map((backtest, idx) => (
            <div
              key={backtest.id}
              onClick={() => setSelectedBacktest(backtest)}
              className={`surface-card cursor-pointer p-5 transition duration-300 hover:-translate-y-1 hover:border-[#98d7f7] animate-fade-in-up stagger-${Math.min(
                idx + 1,
                4
              )} ${selectedBacktest?.id === backtest.id ? "border-[#4cb4f0]" : ""}`}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <div>
                  <p className="enterprise-kpi">Symbol</p>
                  <p className="mt-2 text-xl font-semibold text-[#0b2a5b]">{backtest.symbol}</p>
                  <p className="mt-1 text-sm text-slate-500">{getStrategyName(backtest.strategy_id)}</p>
                </div>
                <div>
                  <p className="enterprise-kpi">Final Value</p>
                  <p
                    className={`mt-2 text-xl font-semibold ${
                      backtest.final_value >= backtest.initial_capital ? "status-positive" : "status-negative"
                    }`}
                  >
                    ${backtest.final_value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p className="enterprise-kpi">Return</p>
                  <p className={`mt-2 text-xl font-semibold ${backtest.total_return >= 0 ? "status-positive" : "status-negative"}`}>
                    {backtest.total_return >= 0 ? "+" : ""}
                    {backtest.total_return.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="enterprise-kpi">Sharpe</p>
                  <p className="mt-2 text-xl font-semibold text-[#0b2a5b]">{backtest.sharpe_ratio.toFixed(2)}</p>
                </div>
                <div>
                  <p className="enterprise-kpi">Drawdown</p>
                  <p className="mt-2 text-xl font-semibold status-negative">{backtest.max_drawdown.toFixed(2)}%</p>
                </div>
                <div className="xl:text-right">
                  <p className="enterprise-kpi">Created</p>
                  <p className="mt-2 text-sm text-slate-500">
                    {new Date(backtest.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#007cc3]">View details</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
