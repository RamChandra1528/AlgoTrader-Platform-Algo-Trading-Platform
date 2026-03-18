"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageLoader from "@/components/PageLoader";
import { isAuthenticated } from "@/lib/auth";
import { strategiesApi } from "@/lib/api";

interface Strategy {
  id: number;
  name: string;
  strategy_type: string;
  parameters?: Record<string, number>;
  is_active: boolean;
  created_at: string;
}

const STRATEGY_LABELS: Record<string, string> = {
  ma_crossover: "Moving Average Crossover",
  rsi: "RSI Strategy",
};

const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  ma_crossover: "Buys when fast MA crosses above slow MA, sells when it crosses below.",
  rsi: "Buys when RSI drops below oversold, sells when RSI rises above overbought.",
};

export default function Strategies() {
  const router = useRouter();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    strategy_type: "ma_crossover",
    parameters: {} as Record<string, number>,
  });

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadStrategies();
  }, [router]);

  const loadStrategies = async () => {
    try {
      setLoading(true);
      const res = await strategiesApi.list();
      setStrategies(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load strategies");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await strategiesApi.create({
        name: formData.name,
        strategy_type: formData.strategy_type,
        parameters: Object.keys(formData.parameters).length > 0 ? formData.parameters : undefined,
      });
      setFormData({ name: "", strategy_type: "ma_crossover", parameters: {} });
      setShowForm(false);
      loadStrategies();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create strategy");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this strategy?")) return;
    try {
      await strategiesApi.delete(id);
      loadStrategies();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to delete strategy");
    }
  };

  if (loading) {
    return <PageLoader label="Loading strategies" />;
  }

  return (
    <AppShell
      eyebrow="Strategy lab"
      title="Strategies"
      subtitle={`${strategies.length} strategies configured. Define reusable logic for backtesting, execution, and auto-trading.`}
      actions={
        <button
          onClick={() => setShowForm(!showForm)}
          className={showForm ? "enterprise-button-secondary" : "enterprise-button-primary"}
        >
          {showForm ? "Cancel" : "New Strategy"}
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
          <p className="app-kicker">Create strategy</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">
            Define a new strategy blueprint.
          </h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Strategy name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-premium"
                placeholder="e.g. AAPL MA Crossover"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Strategy type</label>
              <select
                value={formData.strategy_type}
                onChange={(e) => setFormData({ ...formData, strategy_type: e.target.value, parameters: {} })}
                className="input-premium"
              >
                <option value="ma_crossover">Moving Average Crossover</option>
                <option value="rsi">RSI Strategy</option>
              </select>
              <p className="mt-2 text-sm text-slate-500">{STRATEGY_DESCRIPTIONS[formData.strategy_type]}</p>
            </div>

            {formData.strategy_type === "ma_crossover" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Fast period</label>
                  <input
                    type="number"
                    value={formData.parameters.fast_period || 10}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parameters: { ...formData.parameters, fast_period: parseInt(e.target.value) || 10 },
                      })
                    }
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Slow period</label>
                  <input
                    type="number"
                    value={formData.parameters.slow_period || 30}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parameters: { ...formData.parameters, slow_period: parseInt(e.target.value) || 30 },
                      })
                    }
                    className="input-premium"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">RSI period</label>
                  <input
                    type="number"
                    value={formData.parameters.rsi_period || 14}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parameters: { ...formData.parameters, rsi_period: parseInt(e.target.value) || 14 },
                      })
                    }
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Overbought</label>
                  <input
                    type="number"
                    value={formData.parameters.overbought || 70}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parameters: { ...formData.parameters, overbought: parseInt(e.target.value) || 70 },
                      })
                    }
                    className="input-premium"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-[#0b2a5b]">Oversold</label>
                  <input
                    type="number"
                    value={formData.parameters.oversold || 30}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        parameters: { ...formData.parameters, oversold: parseInt(e.target.value) || 30 },
                      })
                    }
                    className="input-premium"
                  />
                </div>
              </div>
            )}

            <button type="submit" className="enterprise-button-primary w-full">
              Create Strategy
            </button>
          </form>
        </div>
      ) : null}

      {strategies.length === 0 ? (
        <div className="enterprise-empty">
          <p className="text-xl font-semibold text-[#0b2a5b]">No strategies yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Create your first trading strategy to start testing and execution workflows.
          </p>
          <button onClick={() => setShowForm(true)} className="enterprise-button-primary mt-6">
            Create Strategy
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {strategies.map((strategy, idx) => (
            <div
              key={strategy.id}
              className={`surface-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(10,61,145,0.12)] animate-fade-in-up stagger-${Math.min(
                idx + 1,
                4
              )}`}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-[#0b2a5b]">{strategy.name}</h3>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        strategy.is_active
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {strategy.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#007cc3]">
                    {STRATEGY_LABELS[strategy.strategy_type] || strategy.strategy_type}
                  </p>
                  {strategy.parameters && Object.keys(strategy.parameters).length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {Object.entries(strategy.parameters).map(([key, val]) => (
                        <span
                          key={key}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                        >
                          {key.replace(/_/g, " ")}: <span className="font-semibold text-[#0b2a5b]">{val}</span>
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
                    Created{" "}
                    {new Date(strategy.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={() => router.push("/backtests")} className="enterprise-button-secondary">
                    Backtest
                  </button>
                  <button onClick={() => handleDelete(strategy.id)} className="enterprise-button-danger">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
