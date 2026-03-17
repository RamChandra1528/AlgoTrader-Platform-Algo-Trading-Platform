"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { isAuthenticated } from "@/lib/auth";
import { tradingApi, strategiesApi } from "@/lib/api";
import { useTrading } from "@/components/Providers";

interface Position {
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  unrealized_pnl: number;
  market_value: number;
}

interface Trade {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  pnl: number;
  executed_at: string;
}

interface Strategy {
  id: number;
  name: string;
}

export default function Positions() {
  const router = useRouter();
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"open" | "history" | "trade">("open");
  const { account } = useTrading();
  const [tradeForm, setTradeForm] = useState({
    symbol: "AAPL",
    side: "buy",
    quantity: 1,
    strategy_id: "",
  });
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadPositions();
  }, [router]);

  useEffect(() => {
    if (account?.positions) {
      setPositions(account.positions as any);
    }
  }, [account]);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const [portfolioRes, historyRes, strategiesRes] = await Promise.all([
        tradingApi.portfolio().catch(() => ({ data: { positions: [] } })),
        tradingApi.history().catch(() => ({ data: [] })),
        strategiesApi.list().catch(() => ({ data: [] })),
      ]);
      setPositions(portfolioRes.data?.positions || []);
      setTrades(Array.isArray(historyRes.data) ? historyRes.data : []);
      setStrategies(strategiesRes.data || []);
    } catch (err: any) {
      setError("Failed to load positions");
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExecuting(true);
    try {
      await tradingApi.execute({
        symbol: tradeForm.symbol.toUpperCase(),
        side: tradeForm.side,
        quantity: tradeForm.quantity,
        strategy_id: tradeForm.strategy_id ? parseInt(tradeForm.strategy_id) : undefined,
      });
      loadPositions();
      setActiveTab("open");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Trade execution failed");
    } finally {
      setExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading positions...</p>
        </div>
      </div>
    );
  }

  const totalUnrealized = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0);
  const totalMarketValue = positions.reduce((sum, p) => sum + p.market_value, 0);

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />

      <div className="flex-1 ml-64">
        <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800/50 sticky top-0 z-40">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Positions & Trading</h1>
              <div className="flex gap-6 mt-1">
                <span className="text-gray-500 text-sm">
                  Market Value: <span className="text-white font-semibold">${totalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
                <span className="text-gray-500 text-sm">
                  Unrealized P&L:{" "}
                  <span className={`font-semibold ${totalUnrealized >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {totalUnrealized >= 0 ? "+" : ""}${totalUnrealized.toFixed(2)}
                  </span>
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab(activeTab === "trade" ? "open" : "trade")}
              className={activeTab === "trade" ? "px-4 py-2 bg-gray-800 text-gray-300 rounded-lg transition text-sm font-medium border border-gray-700/50 hover:bg-gray-700" : "btn-glow text-sm"}
            >
              {activeTab === "trade" ? "Cancel" : "⚡ New Trade"}
            </button>
          </div>
        </header>

        <main className="px-6 py-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Trade Form */}
          {activeTab === "trade" && (
            <div className="glass-card p-6 mb-6 animate-fade-in-up">
              <h2 className="text-lg font-semibold text-white mb-4">Execute Paper Trade</h2>
              <form onSubmit={handleTrade} className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Symbol</label>
                    <input
                      type="text"
                      required
                      value={tradeForm.symbol}
                      onChange={(e) => setTradeForm({ ...tradeForm, symbol: e.target.value })}
                      className="input-premium"
                      placeholder="AAPL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Side</label>
                    <select
                      value={tradeForm.side}
                      onChange={(e) => setTradeForm({ ...tradeForm, side: e.target.value })}
                      className="input-premium"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Quantity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={tradeForm.quantity}
                      onChange={(e) => setTradeForm({ ...tradeForm, quantity: parseInt(e.target.value) || 1 })}
                      className="input-premium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Strategy (optional)</label>
                    <select
                      value={tradeForm.strategy_id}
                      onChange={(e) => setTradeForm({ ...tradeForm, strategy_id: e.target.value })}
                      className="input-premium"
                    >
                      <option value="">None</option>
                      {strategies.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={executing}
                  className={`w-full px-4 py-2.5 rounded-lg transition-all font-semibold text-white disabled:opacity-50 ${
                    tradeForm.side === "buy"
                      ? "bg-green-600 hover:bg-green-500 shadow-lg shadow-green-500/20"
                      : "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-500/20"
                  }`}
                >
                  {executing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Executing...
                    </span>
                  ) : (
                    `${tradeForm.side === "buy" ? "Buy" : "Sell"} ${tradeForm.quantity} ${tradeForm.symbol.toUpperCase()}`
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Tabs */}
          {activeTab !== "trade" && (
            <>
              <div className="flex gap-1 mb-6 bg-gray-900/50 rounded-lg p-1 w-fit">
                <button
                  onClick={() => setActiveTab("open")}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    activeTab === "open"
                      ? "bg-primary-600/20 text-primary-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Open Positions ({positions.length})
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    activeTab === "history"
                      ? "bg-primary-600/20 text-primary-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Trade History ({trades.length})
                </button>
              </div>

              {/* Open Positions */}
              {activeTab === "open" && (
                <>
                  {positions.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                      <div className="text-4xl mb-4 opacity-50">💼</div>
                      <h3 className="text-lg font-semibold text-white mb-2">No open positions</h3>
                      <p className="text-gray-400 text-sm mb-6">Execute your first trade to get started</p>
                      <button onClick={() => setActiveTab("trade")} className="btn-glow text-sm">
                        Execute Trade
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {positions.map((position, idx) => (
                        <div
                          key={idx}
                          className={`glass-card p-5 hover:border-gray-700/50 transition-all duration-200 animate-fade-in-up stagger-${Math.min(idx + 1, 4)}`}
                        >
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Symbol</p>
                              <p className="text-white font-bold text-lg">{position.symbol}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Quantity</p>
                              <p className="text-white font-semibold">{position.quantity}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Avg Price</p>
                              <p className="text-white font-semibold">${position.avg_price.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Current</p>
                              <p className="text-white font-semibold">${position.current_price.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Market Value</p>
                              <p className="text-white font-semibold">${position.market_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-[10px] uppercase tracking-wider">Unrealized P&L</p>
                              <p className={`font-bold text-lg ${position.unrealized_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {position.unrealized_pnl >= 0 ? "+" : ""}${position.unrealized_pnl.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Trade History */}
              {activeTab === "history" && (
                <>
                  {trades.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                      <div className="text-4xl mb-4 opacity-50">📋</div>
                      <p className="text-gray-400">No trade history</p>
                    </div>
                  ) : (
                    <div className="glass-card overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-800/50">
                            <th className="text-left px-4 py-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Symbol</th>
                            <th className="text-left px-4 py-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Side</th>
                            <th className="text-left px-4 py-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Qty</th>
                            <th className="text-left px-4 py-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Price</th>
                            <th className="text-left px-4 py-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">P&L</th>
                            <th className="text-left px-4 py-3 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades.map((trade) => (
                            <tr
                              key={trade.id}
                              className="border-b border-gray-800/30 hover:bg-gray-800/20 transition"
                            >
                              <td className="px-4 py-3 text-white font-bold text-sm">{trade.symbol}</td>
                              <td className={`px-4 py-3 text-sm font-semibold ${trade.side === "buy" ? "text-green-400" : "text-red-400"}`}>
                                {trade.side.toUpperCase()}
                              </td>
                              <td className="px-4 py-3 text-white text-sm">{trade.quantity}</td>
                              <td className="px-4 py-3 text-white text-sm">${trade.price.toFixed(2)}</td>
                              <td className={`px-4 py-3 text-sm font-semibold ${trade.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-gray-400 text-sm">
                                {new Date(trade.executed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
