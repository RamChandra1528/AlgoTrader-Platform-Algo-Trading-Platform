"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeToPriceUpdates } from "@/lib/websocket";

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  change: number;
  changePercent: number;
}

interface WatchlistItem {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdate: number;
  flash: boolean;
}

const ALL_SYMBOLS = [
  "AAPL",
  "GOOGL",
  "MSFT",
  "AMZN",
  "META",
  "TSLA",
  "NVDA",
  "AMD",
  "NFLX",
  "JPM",
  "V",
  "JNJ",
  "WMT",
  "PG",
  "DIS",
];

const PREVIEW_SYMBOLS = ALL_SYMBOLS.slice(0, 6);

interface MarketPricesProps {
  mode?: "compact" | "full";
}

export default function MarketPrices({ mode = "compact" }: MarketPricesProps) {
  const router = useRouter();
  const [prices, setPrices] = useState<Record<string, WatchlistItem>>(
    ALL_SYMBOLS.reduce(
      (acc, symbol) => ({
        ...acc,
        [symbol]: {
          symbol,
          price: 0,
          change: 0,
          changePercent: 0,
          lastUpdate: 0,
          flash: false,
        },
      }),
      {}
    )
  );

  useEffect(() => {
    const unsubscribe = subscribeToPriceUpdates((update: PriceUpdate) => {
      setPrices((prev) => {
        const current = prev[update.symbol];
        if (current && current.lastUpdate === update.timestamp) {
          return prev;
        }

        return {
          ...prev,
          [update.symbol]: {
            symbol: update.symbol,
            price: update.price,
            change: update.change,
            changePercent: update.changePercent,
            lastUpdate: update.timestamp,
            flash: true,
          },
        };
      });

      setTimeout(() => {
        setPrices((prev) => ({
          ...prev,
          [update.symbol]: {
            ...prev[update.symbol],
            flash: false,
          },
        }));
      }, 500);
    });

    return () => unsubscribe();
  }, []);

  const visibleSymbols = mode === "full" ? ALL_SYMBOLS : PREVIEW_SYMBOLS;
  const gridClass =
    mode === "full"
      ? "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      : "grid grid-cols-1 gap-4 md:grid-cols-2";

  return (
    <div className="surface-card p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="app-kicker">Market watch</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Market prices</h2>
          <p className="mt-2 text-sm text-slate-500">
            {mode === "full"
              ? "Live prices for all tracked companies in the platform watchlist."
              : "Live prices for the primary watchlist, with a separate page for the full market view."}
          </p>
        </div>
        <button
          onClick={() => router.push(mode === "full" ? "/dashboard" : "/markets")}
          className="enterprise-button-secondary self-start whitespace-nowrap px-4 py-2 sm:self-center"
        >
          {mode === "full" ? "Less market prices" : "More market prices"}
        </button>
      </div>

      <div className={gridClass}>
        {visibleSymbols.map((symbol) => {
          const item = prices[symbol];
          const isUp = item.changePercent >= 0;
          return (
            <div
              key={symbol}
              className={`rounded-sm border border-slate-200 bg-slate-50 ${mode === "full" ? "p-5" : "p-4"} transition duration-300 hover:border-[#9fd9f8] ${
                item.flash ? "value-flash" : ""
              }`}
            >
              <div className={`gap-3 ${mode === "full" ? "flex items-start justify-between" : "flex flex-col items-start"}`}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {symbol}
                  </p>
                  <p className={`mt-3 font-semibold tracking-tight text-[#0b2a5b] ${mode === "full" ? "text-2xl" : "text-[2rem]"}`}>
                    {item.price > 0 ? `$${item.price.toFixed(2)}` : "--"}
                  </p>
                </div>
                <span
                  className={`w-fit max-w-full whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                    isUp
                      ? "border-green-200 bg-green-50 text-green-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {isUp ? "+" : ""}
                  {item.changePercent.toFixed(2)}%
                </span>
              </div>

              <p className={`mt-3 text-sm font-semibold ${isUp ? "status-positive" : "status-negative"}`}>
                {isUp ? "+" : "-"}${Math.abs(item.change).toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
