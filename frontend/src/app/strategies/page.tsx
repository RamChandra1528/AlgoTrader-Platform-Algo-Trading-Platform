"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
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
  ma_crossover: "Buys when fast MA crosses above slow MA, sells when it crosses below",
  rsi: "Buys when RSI drops below oversold, sells when RSI rises above overbought",
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading strategies...</p>
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
              <h1 className="text-2xl font-bold text-white">Strategies</h1>
              <p className="text-gray-500 text-sm">{strategies.length} strategies configured</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className={showForm ? "px-4 py-2 bg-gray-800 text-gray-300 rounded-lg transition text-sm font-medium border border-gray-700/50 hover:bg-gray-700" : "btn-glow text-sm"}
            >
              {showForm ? "Cancel" : "+ New Strategy"}
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
              <h2 className="text-lg font-semibold text-white mb-4">Create New Strategy</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Strategy Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-premium"
                    placeholder="e.g., AAPL MA Crossover"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Strategy Type</label>
                  <select
                    value={formData.strategy_type}
                    onChange={(e) => setFormData({ ...formData, strategy_type: e.target.value, parameters: {} })}
                    className="input-premium"
                  >
                    <option value="ma_crossover">Moving Average Crossover</option>
                    <option value="rsi">RSI Strategy</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{STRATEGY_DESCRIPTIONS[formData.strategy_type]}</p>
                </div>

                {/* MA Parameters */}
                {formData.strategy_type === "ma_crossover" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Fast Period</label>
                      <input
                        type="number"
                        value={formData.parameters.fast_period || 10}
                        onChange={(e) => setFormData({ ...formData, parameters: { ...formData.parameters, fast_period: parseInt(e.target.value) || 10 } })}
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Slow Period</label>
                      <input
                        type="number"
                        value={formData.parameters.slow_period || 30}
                        onChange={(e) => setFormData({ ...formData, parameters: { ...formData.parameters, slow_period: parseInt(e.target.value) || 30 } })}
                        className="input-premium"
                      />
                    </div>
                  </div>
                )}

                {/* RSI Parameters */}
                {formData.strategy_type === "rsi" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">RSI Period</label>
                      <input
                        type="number"
                        value={formData.parameters.rsi_period || 14}
                        onChange={(e) => setFormData({ ...formData, parameters: { ...formData.parameters, rsi_period: parseInt(e.target.value) || 14 } })}
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Overbought</label>
                      <input
                        type="number"
                        value={formData.parameters.overbought || 70}
                        onChange={(e) => setFormData({ ...formData, parameters: { ...formData.parameters, overbought: parseInt(e.target.value) || 70 } })}
                        className="input-premium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Oversold</label>
                      <input
                        type="number"
                        value={formData.parameters.oversold || 30}
                        onChange={(e) => setFormData({ ...formData, parameters: { ...formData.parameters, oversold: parseInt(e.target.value) || 30 } })}
                        className="input-premium"
                      />
                    </div>
                  </div>
                )}

                <button type="submit" className="w-full btn-glow">
                  Create Strategy
                </button>
              </form>
            </div>
          )}

          {/* Strategies List */}
          {strategies.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="text-lg font-semibold text-white mb-2">No strategies yet</h3>
              <p className="text-gray-400 text-sm mb-6">Create your first trading strategy to get started</p>
              <button onClick={() => setShowForm(true)} className="btn-glow text-sm">
                Create Strategy
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {strategies.map((strategy, idx) => (
                <div
                  key={strategy.id}
                  className={`glass-card p-5 hover:border-gray-700/50 transition-all duration-200 animate-fade-in-up stagger-${Math.min(idx + 1, 4)}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          strategy.is_active
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-gray-700/50 text-gray-400 border border-gray-600/20"
                        }`}>
                          {strategy.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">{STRATEGY_LABELS[strategy.strategy_type] || strategy.strategy_type}</p>
                      {strategy.parameters && Object.keys(strategy.parameters).length > 0 && (
                        <div className="flex gap-3 mt-2">
                          {Object.entries(strategy.parameters).map(([key, val]) => (
                            <span key={key} className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">
                              {key.replace(/_/g, ' ')}: <span className="text-gray-300">{val}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-gray-600 text-xs mt-2">
                        Created {new Date(strategy.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push("/backtests")}
                        className="px-3 py-2 bg-primary-600/10 text-primary-400 border border-primary-500/20 hover:bg-primary-600/20 rounded-lg transition text-sm font-medium"
                      >
                        Backtest
                      </button>
                      <button
                        onClick={() => handleDelete(strategy.id)}
                        className="px-3 py-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg transition text-sm font-medium"
                      >
                        Delete
                      </button>
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
