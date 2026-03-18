"use client";

import { useEffect, useState } from "react";
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

const DEFAULT_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "TSLA"];

export default function MarketPrices() {
  const [prices, setPrices] = useState<Record<string, WatchlistItem>>(
    DEFAULT_SYMBOLS.reduce(
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

  return (
    <div className="surface-card p-6">
      <div className="mb-4">
        <p className="app-kicker">Market watch</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">Market prices</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {DEFAULT_SYMBOLS.map((symbol) => {
          const item = prices[symbol];
          const isUp = item.changePercent >= 0;
          return (
            <div
              key={symbol}
              className={`rounded-sm border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:border-[#9fd9f8] ${
                item.flash ? "value-flash" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {symbol}
                  </p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-[#0b2a5b]">
                    {item.price > 0 ? `$${item.price.toFixed(2)}` : "--"}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
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
