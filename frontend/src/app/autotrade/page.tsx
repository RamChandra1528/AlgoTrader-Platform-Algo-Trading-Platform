"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { isAuthenticated } from "@/lib/auth";
import { autoTradingApi, dashboardApi } from "@/lib/api";
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
  const [loading, setLoading] = useState(false);
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
      // Refresh recommendations after execution to show updated data
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

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case "BUY": return "text-green-400 bg-green-500/10 border-green-500/20";
      case "SELL": return "text-red-400 bg-red-500/10 border-red-500/20";
      default: return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />

      <div className="flex-1 ml-64">
        <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50 sticky top-0 z-40">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-primary-500">⚡</span> Auto Trade
              </h1>
              <p className="text-gray-500 text-sm">Automated market screening and execution</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Equity</p>
                <p className="text-white font-bold">
                  ${((account?.equity ?? 0) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <button
                onClick={liveRunning ? handleLiveStop : handleLiveStart}
                className={liveRunning ? "px-4 py-2 bg-red-600/20 text-red-300 rounded-lg transition text-sm font-medium border border-red-500/30 hover:bg-red-600/30" : "px-4 py-2 bg-green-600/20 text-green-300 rounded-lg transition text-sm font-medium border border-green-500/30 hover:bg-green-600/30"}
              >
                {liveRunning ? "Stop Live" : "Start Live"}
              </button>
            </div>
            {recommendations.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Budget</p>
                  <p className="text-white font-bold">${budget.toLocaleString()}</p>
                </div>
                <button
                  onClick={handleExecute}
                  disabled={executing || scanning}
                  className="btn-glow flex items-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)' }}
                >
                  {executing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Executing...
                    </>
                  ) : (
                    "Auto-Execute Top Signals"
                  )}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="px-6 py-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Configuration Panel */}
          <div className="glass-card p-6 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 rounded-full blur-[64px]" />
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-xl font-semibold text-white mb-2">Configure Auto-Trader</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Set your budget and the system will automatically scan popular tech stocks (AAPL, MSFT, TSLA, etc.), 
                  analyze them using MA Crossover and RSI indicators, and execute trades for the strongest BUY signals.
                </p>
                
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      Trading Budget ($)
                    </label>
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
                    className="btn-glow py-3 h-[46px] disabled:opacity-50 flex items-center gap-2"
                  >
                    {scanning ? (
                       <>
                       <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                         <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                         <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                       </svg>
                       Scanning...
                     </>
                    ) : (
                      "Scan Market"
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Profit Target (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={liveConfig.profit_target_pct}
                      onChange={(e) => setLiveConfig({ ...liveConfig, profit_target_pct: Number(e.target.value) })}
                      className="input-premium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Stop Loss (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={liveConfig.stop_loss_pct}
                      onChange={(e) => setLiveConfig({ ...liveConfig, stop_loss_pct: Number(e.target.value) })}
                      className="input-premium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Budget / Trade</label>
                    <input
                      type="number"
                      value={liveConfig.budget_per_trade}
                      onChange={(e) => setLiveConfig({ ...liveConfig, budget_per_trade: Number(e.target.value) })}
                      className="input-premium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Max Positions</label>
                    <input
                      type="number"
                      value={liveConfig.max_positions}
                      onChange={(e) => setLiveConfig({ ...liveConfig, max_positions: Number(e.target.value) })}
                      className="input-premium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Loop (sec)</label>
                    <input
                      type="number"
                      value={liveConfig.loop_interval_sec}
                      onChange={(e) => setLiveConfig({ ...liveConfig, loop_interval_sec: Number(e.target.value) })}
                      className="input-premium"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">How it works</h3>
                <ul className="space-y-3 text-sm text-gray-400">
                  <li className="flex gap-2">
                    <span className="text-primary-500">1.</span>
                    System scans 15 popular high-volume stocks
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary-500">2.</span>
                    Calculates 10/30 SMA and 14-day RSI for each
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary-500">3.</span>
                    Generates BUY/SELL signals based on technical confluence
                  </li>
                  <li className="flex gap-2">
                    <span className="text-green-500">4.</span>
                    Auto-execution automatically buys top 3 BUY signals, distributing budget evenly
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Execution Results */}
          {results && (
            <div className="mb-8 animate-fade-in-up">
              <h2 className="text-lg font-semibold text-white mb-4">Execution Results</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="glass-card p-4 border-primary-500/30 bg-primary-500/5">
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Trades Executed</p>
                  <p className="text-2xl font-bold text-white">{results.executed_trades.filter(t => t.status === 'success').length}</p>
                </div>
                <div className="glass-card p-4 border-green-500/30 bg-green-500/5">
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Total Allocated</p>
                  <p className="text-2xl font-bold text-green-400">${results.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Budget Remaining</p>
                  <p className="text-2xl font-bold text-white">${results.budget_remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>

              <div className="glass-card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3 font-semibold text-left">Action</th>
                      <th className="px-4 py-3 font-semibold text-left">Symbol</th>
                      <th className="px-4 py-3 font-semibold text-left">Quantity</th>
                      <th className="px-4 py-3 font-semibold text-left">Price</th>
                      <th className="px-4 py-3 font-semibold text-left">Total</th>
                      <th className="px-4 py-3 font-semibold text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/50">
                    {results.executed_trades.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No trades were executed.</td>
                      </tr>
                    ) : (
                      results.executed_trades.map((trade, idx) => (
                        <tr key={idx} className="hover:bg-gray-800/20 transition">
                          <td className="px-4 py-3 text-white font-bold text-sm capitalize">{trade.action}</td>
                          <td className="px-4 py-3 text-white font-bold">{trade.symbol}</td>
                          <td className="px-4 py-3 text-gray-300">{trade.quantity}</td>
                          <td className="px-4 py-3 text-gray-300">${trade.price.toFixed(2)}</td>
                          <td className="px-4 py-3 text-gray-300">${trade.allocated_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className={`text-xs font-bold ${trade.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {trade.status.toUpperCase()}
                              </span>
                              <span className="text-[10px] text-gray-500">{trade.detail}</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Market Scanner Results */}
          {recommendations.length > 0 && (
            <div className="animate-fade-in-up stagger-2 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Market Scan Results</h2>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span> Buy Signals: {recommendations.filter(r => r.signal === 'BUY').length}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec, idx) => (
                  <div key={rec.symbol} className={`glass-card p-5 animate-fade-in-up stagger-${Math.min(idx + 1, 4)} hover:border-gray-700/50 transition-all`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{rec.symbol}</h3>
                        <p className="text-gray-400 text-sm">${rec.current_price.toFixed(2)}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded border ${getSignalColor(rec.signal)}`}>
                          {rec.signal}
                        </span>
                        <span className="text-xs text-gray-500 mt-1 font-medium items-center flex gap-1">
                          Conf: <span className={rec.confidence > 60 ? 'text-green-400' : rec.confidence < 40 ? 'text-red-400' : 'text-yellow-400'}>{rec.confidence}%</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Indicators */}
                      <div className="grid grid-cols-3 gap-2 bg-gray-900/50 rounded-lg p-2 border border-gray-800">
                        <div className="text-center">
                          <p className="text-[9px] text-gray-500 uppercase font-semibold">SMA-10</p>
                          <p className="text-white text-xs font-mono">${rec.indicators.sma_10}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-gray-500 uppercase font-semibold">SMA-30</p>
                          <p className="text-white text-xs font-mono">${rec.indicators.sma_30}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] text-gray-500 uppercase font-semibold">RSI-14</p>
                          <p className={`text-xs font-mono font-semibold ${rec.indicators.rsi_14 > 70 ? 'text-red-400' : rec.indicators.rsi_14 < 30 ? 'text-green-400' : 'text-gray-300'}`}>
                            {rec.indicators.rsi_14}
                          </p>
                        </div>
                      </div>

                      {/* Reasons */}
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Signals</p>
                        <ul className="space-y-1">
                          {rec.reasons.map((reason, i) => (
                            <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                              <span className="text-primary-500 mt-0.5">•</span> 
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
