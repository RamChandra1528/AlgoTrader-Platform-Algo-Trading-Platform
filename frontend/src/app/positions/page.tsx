"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageLoader from "@/components/PageLoader";
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
    } catch {
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
    return <PageLoader label="Loading positions" />;
  }

  const totalUnrealized = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0);
  const totalMarketValue = positions.reduce((sum, p) => sum + p.market_value, 0);

  return (
    <AppShell
      eyebrow="Execution"
      title="Positions and Trading"
      subtitle="Review open positions, inspect paper-trade history, and execute new trades without changing the underlying trading workflow."
      actions={
        <>
          <div className="enterprise-chip">
            Market Value ${totalMarketValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className={`enterprise-chip ${totalUnrealized >= 0 ? "status-positive" : "status-negative"}`}>
            Unrealized {totalUnrealized >= 0 ? "+" : ""}${totalUnrealized.toFixed(2)}
          </div>
          <button
            onClick={() => setActiveTab(activeTab === "trade" ? "open" : "trade")}
            className={activeTab === "trade" ? "enterprise-button-secondary" : "enterprise-button-primary"}
          >
            {activeTab === "trade" ? "Cancel" : "New Trade"}
          </button>
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {activeTab === "trade" ? (
        <div className="surface-card mb-6 p-6 animate-fade-in-up">
          <p className="app-kicker">Trade ticket</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">
            Execute paper trade
          </h2>
          <form onSubmit={handleTrade} className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Symbol</label>
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
                <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Side</label>
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
                <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Quantity</label>
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
                <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Strategy (optional)</label>
                <select
                  value={tradeForm.strategy_id}
                  onChange={(e) => setTradeForm({ ...tradeForm, strategy_id: e.target.value })}
                  className="input-premium"
                >
                  <option value="">None</option>
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={executing}
              className={tradeForm.side === "buy" ? "enterprise-button-success w-full" : "enterprise-button-danger w-full"}
            >
              {executing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
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
      ) : (
        <>
          <div className="mb-6">
            <div className="enterprise-tabs">
              <button
                onClick={() => setActiveTab("open")}
                className={activeTab === "open" ? "enterprise-tab-active" : "enterprise-tab"}
              >
                Open Positions ({positions.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={activeTab === "history" ? "enterprise-tab-active" : "enterprise-tab"}
              >
                Trade History ({trades.length})
              </button>
            </div>
          </div>

          {activeTab === "open" ? (
            positions.length === 0 ? (
              <div className="enterprise-empty">
                <p className="text-xl font-semibold text-[#0b2a5b]">No open positions</p>
                <p className="mt-2 text-sm text-slate-500">Execute your first paper trade to get started.</p>
                <button onClick={() => setActiveTab("trade")} className="enterprise-button-primary mt-6">
                  Execute Trade
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {positions.map((position, idx) => (
                  <div
                    key={idx}
                    className={`surface-card p-5 animate-fade-in-up stagger-${Math.min(idx + 1, 4)}`}
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                      <div>
                        <p className="enterprise-kpi">Symbol</p>
                        <p className="mt-2 text-xl font-semibold text-[#0b2a5b]">{position.symbol}</p>
                      </div>
                      <div>
                        <p className="enterprise-kpi">Quantity</p>
                        <p className="mt-2 text-lg font-semibold text-[#0b2a5b]">{position.quantity}</p>
                      </div>
                      <div>
                        <p className="enterprise-kpi">Avg Price</p>
                        <p className="mt-2 text-lg font-semibold text-[#0b2a5b]">${position.avg_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="enterprise-kpi">Current</p>
                        <p className="mt-2 text-lg font-semibold text-[#0b2a5b]">${position.current_price.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="enterprise-kpi">Market Value</p>
                        <p className="mt-2 text-lg font-semibold text-[#0b2a5b]">
                          $
                          {position.market_value.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="enterprise-kpi">Unrealized P&L</p>
                        <p
                          className={`mt-2 text-xl font-semibold ${
                            position.unrealized_pnl >= 0 ? "status-positive" : "status-negative"
                          }`}
                        >
                          {position.unrealized_pnl >= 0 ? "+" : ""}${position.unrealized_pnl.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : trades.length === 0 ? (
            <div className="enterprise-empty">
              <p className="text-xl font-semibold text-[#0b2a5b]">No trade history</p>
              <p className="mt-2 text-sm text-slate-500">Executed paper trades will appear here.</p>
            </div>
          ) : (
            <div className="surface-card overflow-hidden">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>P&amp;L</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id}>
                      <td className="font-semibold text-[#0b2a5b]">{trade.symbol}</td>
                      <td className={trade.side === "buy" ? "status-positive font-semibold" : "status-negative font-semibold"}>
                        {trade.side.toUpperCase()}
                      </td>
                      <td>{trade.quantity}</td>
                      <td>${trade.price.toFixed(2)}</td>
                      <td className={trade.pnl >= 0 ? "status-positive font-semibold" : "status-negative font-semibold"}>
                        {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                      </td>
                      <td className="text-slate-500">
                        {new Date(trade.executed_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
