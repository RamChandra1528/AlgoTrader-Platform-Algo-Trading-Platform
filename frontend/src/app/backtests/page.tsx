"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
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
    } catch (err: any) {
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
      // Auto-select the new result
      if (res.data) setSelectedBacktest(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Backtest failed");
    } finally {
      setRunning(false);
    }
  };

  const getStrategyName = (id: number) => {
    return strategies.find(s => s.id === id)?.name || "Unknown";
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading backtests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />

      <div className="flex-1 ml-64">
        <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50 sticky top-0 z-40">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Backtests</h1>
              <p className="text-gray-500 text-sm">{backtests.length} backtests completed</p>
            </div>
            <button
              onClick={() => { setShowForm(!showForm); setSelectedBacktest(null); }}
              className={showForm ? "px-4 py-2 bg-gray-800 text-gray-300 rounded-lg transition text-sm font-medium border border-gray-700/50 hover:bg-gray-700" : "btn-glow text-sm"}
            >
              {showForm ? "Cancel" : "📊 Run Backtest"}
            </button>
          </div>
        </header>

        <main className="px-6 py-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          {showForm && (
            <div className="glass-card p-6 mb-6 animate-fade-in-up">
              <h2 className="text-lg font-semibold text-white mb-4">Run Backtest</h2>
              {strategies.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-3">You need a strategy first</p>
                  <button
                    onClick={() => router.push("/strategies")}
                    className="px-4 py-2 bg-primary-600/10 text-primary-400 border border-primary-500/20 rounded-lg transition text-sm font-medium hover:bg-primary-600/20"
                  >
                    Create Strategy
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Strategy</label>
                      <select
                        required
                        value={formData.strategy_id}
                        onChange={(e) => setFormData({ ...formData, strategy_id: e.target.value })}
                        className="input-premium"
                      >
                        <option value="">Select a strategy</option>
                        {strategies.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.strategy_type})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Symbol</label>
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
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Start Date</label>
                      <input
                        type="date"
                        required
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">End Date</label>
                      <input
                        type="date"
                        required
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Initial Capital</label>
                      <input
                        type="number"
                        required
                        value={formData.initial_capital}
                        onChange={(e) => setFormData({ ...formData, initial_capital: parseInt(e.target.value) || 100000 })}
                        className="input-premium"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={running}
                    className="w-full btn-glow disabled:opacity-50"
                  >
                    {running ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Running backtest...
                      </span>
                    ) : "Run Backtest"}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Selected Backtest Detail */}
          {selectedBacktest && (
            <div className="glass-card p-6 mb-6 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  {selectedBacktest.symbol} • {getStrategyName(selectedBacktest.strategy_id)}
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    disabled={simulating}
                    onClick={() => simulateBacktest(selectedBacktest)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary-500/20 text-primary-300 bg-primary-500/10 hover:bg-primary-500/20 disabled:opacity-50"
                  >
                    {simulating ? "Simulating..." : "▶ Simulate Live Updates"}
                  </button>
                  <button onClick={() => setSelectedBacktest(null)} className="text-gray-500 hover:text-gray-300 transition">
                    ✕
                  </button>
                </div>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Initial Capital</p>
                  <p className="text-white font-semibold">${selectedBacktest.initial_capital.toLocaleString()}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Final Value</p>
                  <p className={`font-semibold ${selectedBacktest.final_value >= selectedBacktest.initial_capital ? 'text-green-400' : 'text-red-400'}`}>
                    ${selectedBacktest.final_value.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Return</p>
                  <p className={`font-semibold ${selectedBacktest.total_return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedBacktest.total_return >= 0 ? '+' : ''}{selectedBacktest.total_return.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Sharpe Ratio</p>
                  <p className="text-white font-semibold">{selectedBacktest.sharpe_ratio.toFixed(4)}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-gray-500 text-xs mb-1">Max Drawdown</p>
                  <p className="text-red-400 font-semibold">{selectedBacktest.max_drawdown.toFixed(2)}%</p>
                </div>
              </div>

              {/* Mini Equity Curve */}
              {selectedBacktest.equity_curve && selectedBacktest.equity_curve.length > 1 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Equity Curve</p>
                  <div className="bg-gray-800/30 rounded-lg p-4">
                    <svg viewBox="0 0 800 200" className="w-full">
                      {(() => {
                        const curve = selectedBacktest.equity_curve;
                        const values = curve.map(p => p.value);
                        const min = Math.min(...values);
                        const max = Math.max(...values);
                        const range = max - min || 1;
                        const isProfit = values[values.length - 1] >= values[0];
                        const color = isProfit ? '#22c55e' : '#ef4444';

                        const points = curve.map((p, i) => {
                          const x = (i / (curve.length - 1)) * 780 + 10;
                          const y = 190 - ((p.value - min) / range) * 180;
                          return `${x},${y}`;
                        });

                        const areaPoints = [...points, `790,190`, `10,190`];

                        return (
                          <>
                            <defs>
                              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                                <stop offset="100%" stopColor={color} stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <polygon points={areaPoints.join(' ')} fill="url(#equityGrad)" />
                            <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                          </>
                        );
                      })()}
                    </svg>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{selectedBacktest.start_date}</span>
                      <span>{selectedBacktest.end_date}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Results List */}
          {backtests.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">No backtests yet</h3>
              <p className="text-gray-400 text-sm mb-6">Run your first backtest to see strategy performance</p>
              <button onClick={() => setShowForm(true)} className="btn-glow text-sm">
                Run Backtest
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {backtests.map((backtest, idx) => (
                <div
                  key={backtest.id}
                  onClick={() => setSelectedBacktest(backtest)}
                  className={`glass-card p-4 cursor-pointer transition-all duration-200 hover:border-gray-700/50 animate-fade-in-up stagger-${Math.min(idx + 1, 4)} ${
                    selectedBacktest?.id === backtest.id ? 'border-primary-500/30 bg-primary-500/5' : ''
                  }`}
                >
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Symbol</p>
                      <p className="text-white font-bold">{backtest.symbol}</p>
                      <p className="text-gray-500 text-xs">{getStrategyName(backtest.strategy_id)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Final Value</p>
                      <p className={`font-bold ${backtest.final_value >= backtest.initial_capital ? 'text-green-400' : 'text-red-400'}`}>
                        ${backtest.final_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Return</p>
                      <p className={`font-bold ${backtest.total_return >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {backtest.total_return >= 0 ? '+' : ''}{backtest.total_return.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Sharpe</p>
                      <p className="text-white font-bold">{backtest.sharpe_ratio.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Drawdown</p>
                      <p className="text-red-400 font-bold">{backtest.max_drawdown.toFixed(2)}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">
                        {new Date(backtest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-primary-400 text-xs font-medium">View Details →</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
