"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ActivityFeed from "@/components/ActivityFeed";
import AppShell from "@/components/AppShell";
import MarketPrices from "@/components/MarketPrices";
import PageLoader from "@/components/PageLoader";
import RealTimeChart from "@/components/RealTimeChart";
import { isAuthenticated } from "@/lib/auth";
import { dashboardApi, authApi } from "@/lib/api";
import { useTrading } from "@/components/Providers";

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
    format: (v: number) =>
      `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  },
  {
    key: "total_pnl",
    label: "Total P&L",
    format: (v: number) => `${v >= 0 ? "+" : ""}$${v.toFixed(2)}`,
    dynamicColor: true,
  },
  {
    key: "win_rate",
    label: "Win Rate",
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    key: "open_positions",
    label: "Open Positions",
    format: (v: number) => v.toString(),
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { account } = useTrading();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    loadDashboard();
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
    return <PageLoader label="Loading dashboard" />;
  }

  const liveSummary: Summary | null = account
    ? {
        total_pnl: (account.realized_pnl ?? 0) + (account.unrealized_pnl ?? 0),
        total_trades: summary?.total_trades ?? 0,
        open_positions: account.positions?.length ?? 0,
        portfolio_value: account.equity ?? 0,
        win_rate: summary?.win_rate ?? 0,
      }
    : summary;

  return (
    <AppShell
      eyebrow="Overview"
      title="Dashboard"
      subtitle={`Welcome back${user?.full_name ? `, ${user.full_name}` : ""}. Monitor portfolio health, market movement, and live paper-trading activity from one view.`}
      actions={
        <>
          <div className="enterprise-chip">
            <span className="h-2 w-2 rounded-full bg-green-500 pulse-live" />
            Paper Trading Mode
          </div>
          <button onClick={() => router.push("/strategies")} className="enterprise-button-secondary">
            Create Strategy
          </button>
          <button onClick={() => router.push("/backtests")} className="enterprise-button-secondary">
            Run Backtest
          </button>
          <button onClick={() => router.push("/positions")} className="enterprise-button-primary">
            Execute Trade
          </button>
        </>
      }
    >
      {error ? (
        <div className="mb-6 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, idx) => {
          const value = liveSummary?.[card.key as keyof Summary] ?? 0;
          const colorClass = card.dynamicColor
            ? (value as number) >= 0
              ? "status-positive"
              : "status-negative"
            : "text-[#0b2a5b]";

          return (
            <div key={card.key} className={`stat-card animate-fade-in-up stagger-${idx + 1}`}>
              <p className="enterprise-kpi">{card.label}</p>
              <p className={`enterprise-value ${colorClass}`}>{card.format(value as number)}</p>
            </div>
          );
        })}
      </div>

      <div className="surface-card-soft mb-6 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="app-kicker">Quick actions</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">
              Move from analysis to execution.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
              Continue building a strategy, validate it through historical backtests, or enter a paper trade directly.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => router.push("/strategies")} className="enterprise-button-secondary">
              Strategy workspace
            </button>
            <button onClick={() => router.push("/backtests")} className="enterprise-button-secondary">
              Backtesting lab
            </button>
            <button onClick={() => router.push("/autotrade")} className="enterprise-button-primary">
              Auto Trade controls
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <RealTimeChart />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <MarketPrices />
          <ActivityFeed />
        </div>
      </div>
    </AppShell>
  );
}
