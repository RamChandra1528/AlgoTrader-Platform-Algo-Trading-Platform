"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ActivityFeed from "@/components/ActivityFeed";
import MarketPrices from "@/components/MarketPrices";
import RealTimeChart from "@/components/RealTimeChart";
import { isAuthenticated } from "@/lib/auth";
import { dashboardApi, authApi } from "@/lib/api";
import { connectWebSocket, disconnectWebSocket } from "@/lib/websocket";

interface User {
  id: number;
  email: string;
  full_name: string;
}

interface Summary {
  total_pnl: number;
  total_trades: number;
  open_positions: number;
  portfolio_value: number;
  win_rate: number;
}

const statCards = [
  {
    key: "portfolio_value",
    label: "Portfolio Value",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    format: (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    color: "text-white",
    gradientFrom: "from-primary-500/20",
    gradientTo: "to-primary-600/5",
  },
  {
    key: "total_pnl",
    label: "Total P&L",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    format: (v: number) => `${v >= 0 ? '+' : ''}$${v.toFixed(2)}`,
    dynamic_color: true,
    gradientFrom: "from-green-500/20",
    gradientTo: "to-green-600/5",
  },
  {
    key: "win_rate",
    label: "Win Rate",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228M18.75 4.236V2.721M16.27 9.728l-1.395.608a11.246 11.246 0 01-5.75 0l-1.395-.608m7.540 0c-.18.91-.497 1.786-.935 2.594M7.73 9.728a11.15 11.15 0 00.935 2.594" />
      </svg>
    ),
    format: (v: number) => `${v.toFixed(1)}%`,
    color: "text-amber-400",
    gradientFrom: "from-amber-500/20",
    gradientTo: "to-amber-600/5",
  },
  {
    key: "open_positions",
    label: "Open Positions",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    format: (v: number) => v.toString(),
    color: "text-primary-400",
    gradientFrom: "from-primary-500/20",
    gradientTo: "to-purple-600/5",
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    loadDashboard();
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [router]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [userRes, summaryRes] = await Promise.all([
        authApi.me(),
        dashboardApi.summary().catch(() => ({ data: null })),
      ]);
      setUser(userRes.data);
      setSummary(summaryRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard...</p>
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
              <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              <p className="text-gray-500 text-sm">Welcome back, <span className="text-gray-300">{user?.full_name}</span></p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full pulse-live" />
              Paper Trading Mode
            </div>
          </div>
        </header>

        <main className="px-6 py-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((card, idx) => {
              const value = summary?.[card.key as keyof Summary] ?? 0;
              const colorClass = card.dynamic_color
                ? (value as number) >= 0 ? "text-green-400" : "text-red-400"
                : card.color;

              return (
                <div key={card.key} className={`stat-card animate-fade-in-up stagger-${idx + 1}`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.gradientFrom} ${card.gradientTo} opacity-50`} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400 text-sm font-medium">{card.label}</span>
                      <span className="text-gray-500">{card.icon}</span>
                    </div>
                    <p className={`text-2xl font-bold ${colorClass}`}>
                      {card.format(value as number)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
                <p className="text-gray-500 text-sm">Get started with trading</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/strategies")}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-all text-sm font-medium border border-gray-700/50"
                >
                  ⚙️ Create Strategy
                </button>
                <button
                  onClick={() => router.push("/backtests")}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-all text-sm font-medium border border-gray-700/50"
                >
                  📊 Run Backtest
                </button>
                <button
                  onClick={() => router.push("/positions")}
                  className="btn-glow text-sm"
                >
                  ⚡ Execute Trade
                </button>
              </div>
            </div>
          </div>

          {/* Charts and Real-time data */}
          <div className="grid grid-cols-1 gap-6">
            <RealTimeChart />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MarketPrices />
              <ActivityFeed />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
