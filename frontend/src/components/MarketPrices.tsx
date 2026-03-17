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

      // Reset flash after animation
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
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Market Prices</h2>
      <div className="grid grid-cols-2 gap-3">
        {DEFAULT_SYMBOLS.map((symbol) => {
          const item = prices[symbol];
          const isUp = item.changePercent >= 0;
          return (
            <div
              key={symbol}
              className={`bg-gray-800/40 border border-gray-700/30 rounded-lg p-4 hover:border-gray-600/50 transition-all duration-300 ${
                item.flash ? 'value-flash' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-white text-sm">{symbol}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isUp
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {isUp ? "+" : ""}{item.changePercent.toFixed(2)}%
                </span>
              </div>
              <p className="text-xl font-bold text-white mb-1">
                {item.price > 0 ? `$${item.price.toFixed(2)}` : '—'}
              </p>
              <p className={`text-xs flex items-center gap-1 ${isUp ? "text-green-400" : "text-red-400"}`}>
                {isUp ? "↑" : "↓"} ${Math.abs(item.change).toFixed(2)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
