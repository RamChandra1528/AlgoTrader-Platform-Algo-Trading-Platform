'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { subscribeToPriceUpdates } from '@/lib/websocket';

type SymbolKey = 'AAPL' | 'GOOGL' | 'MSFT' | 'TSLA';

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  change: number;
  changePercent: number;
}

interface SeriesPoint {
  time: string;
  price: number;
}

interface QuoteState {
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

const TRACKED_SYMBOLS: SymbolKey[] = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];

const EMPTY_SERIES: Record<SymbolKey, SeriesPoint[]> = {
  AAPL: [],
  GOOGL: [],
  MSFT: [],
  TSLA: [],
};

const EMPTY_QUOTES: Record<SymbolKey, QuoteState | null> = {
  AAPL: null,
  GOOGL: null,
  MSFT: null,
  TSLA: null,
};

export default function RealTimeChart() {
  const [selectedSymbol, setSelectedSymbol] = useState<SymbolKey>('AAPL');
  const [seriesBySymbol, setSeriesBySymbol] = useState<Record<SymbolKey, SeriesPoint[]>>(EMPTY_SERIES);
  const [quotes, setQuotes] = useState<Record<SymbolKey, QuoteState | null>>(EMPTY_QUOTES);

  useEffect(() => {
    const unsubscribe = subscribeToPriceUpdates((price: PriceUpdate) => {
      if (!TRACKED_SYMBOLS.includes(price.symbol as SymbolKey)) {
        return;
      }

      const symbol = price.symbol as SymbolKey;
      const timeLabel = new Date(price.timestamp || Date.now()).toLocaleTimeString();

      setQuotes((prev) => ({
        ...prev,
        [symbol]: {
          price: price.price,
          change: price.change,
          changePercent: price.changePercent,
          timestamp: price.timestamp,
        },
      }));

      setSeriesBySymbol((prev) => {
        const currentSeries = prev[symbol];
        const nextPoint: SeriesPoint = {
          time: timeLabel,
          price: price.price,
        };

        const lastPoint = currentSeries[currentSeries.length - 1];
        const nextSeries =
          lastPoint && lastPoint.time === nextPoint.time
            ? [...currentSeries.slice(0, -1), nextPoint]
            : [...currentSeries, nextPoint];

        return {
          ...prev,
          [symbol]: nextSeries.slice(-60),
        };
      });
    });

    return () => unsubscribe();
  }, []);

  const selectedSeries = seriesBySymbol[selectedSymbol];
  const selectedQuote = quotes[selectedSymbol];

  const { minPrice, maxPrice, pathData, areaPath, points } = useMemo(() => {
    const selectedData = selectedSeries.map((point) => point.price);
    const min = selectedData.length > 0 ? Math.min(...selectedData) : 0;
    const max = selectedData.length > 0 ? Math.max(...selectedData) : 100;
    const range = max - min || 1;
    const pricePadding = range * 0.1;

    const svgWidth = 800;
    const svgHeight = 300;
    const paddingX = 60;
    const paddingY = 30;
    const chartWidth = svgWidth - paddingX * 2;
    const chartHeight = svgHeight - paddingY * 2;

    const seriesPoints = selectedSeries.map((point, index) => {
      const x = paddingX + (index / Math.max(selectedSeries.length - 1, 1)) * chartWidth;
      const y =
        paddingY + ((max + pricePadding - point.price) / (range + pricePadding * 2)) * chartHeight;
      return { x, y, price: point.price };
    });

    const linePath = seriesPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fillPath = linePath
      ? `${linePath} L ${seriesPoints[seriesPoints.length - 1]?.x} ${svgHeight - paddingY} L ${seriesPoints[0]?.x} ${svgHeight - paddingY} Z`
      : '';

    return {
      minPrice: min,
      maxPrice: max,
      pathData: linePath,
      areaPath: fillPath,
      points: seriesPoints,
    };
  }, [selectedSeries]);

  const currentPrice = selectedQuote?.price ?? 0;
  const change = selectedQuote?.change ?? 0;
  const changePercent = selectedQuote?.changePercent ?? 0;
  const isPositive = change >= 0;
  const lineColor = isPositive ? '#15803d' : '#b42318';

  return (
    <div className="surface-card p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="app-kicker">Realtime chart</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#0b2a5b]">{selectedSymbol}</h2>
          <p className="mt-3 text-base text-slate-500">
            <span className="text-2xl font-semibold text-[#0b2a5b]">${currentPrice.toFixed(2)}</span>
            <span className={`ml-3 text-sm font-semibold ${isPositive ? 'status-positive' : 'status-negative'}`}>
              {isPositive ? '+' : ''}
              {change.toFixed(2)} ({isPositive ? '+' : ''}
              {changePercent.toFixed(2)}%)
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {TRACKED_SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              className={
                selectedSymbol === symbol
                  ? 'enterprise-button-primary px-4 py-2'
                  : 'enterprise-button-secondary px-4 py-2'
              }
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {selectedSeries.length > 1 ? (
        <div className="rounded-sm border border-slate-200 bg-[#f7fbff] p-4">
          <svg viewBox="0 0 800 300" className="w-full rounded-sm">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 0.25, 0.5, 0.75, 1].map((i) => (
              <line
                key={`grid-${i}`}
                x1={60}
                y1={30 + i * 240}
                x2={740}
                y2={30 + i * 240}
                stroke="rgba(182, 201, 221, 0.8)"
                strokeDasharray="4,6"
              />
            ))}

            {[0, 0.25, 0.5, 0.75, 1].map((i) => {
              const price = maxPrice + (maxPrice - minPrice || 1) * 0.1 - i * ((maxPrice - minPrice || 1) * 1.2);
              return (
                <text
                  key={`label-${i}`}
                  x={50}
                  y={30 + i * 240 + 5}
                  textAnchor="end"
                  fill="#5f738a"
                  fontSize="12"
                >
                  ${price.toFixed(0)}
                </text>
              );
            })}

            {areaPath ? <path d={areaPath} fill="url(#areaGradient)" /> : null}
            <path d={pathData} stroke={lineColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {points.length > 0 ? (
              <>
                <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="6" fill={lineColor} opacity="0.18" />
                <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={lineColor} />
              </>
            ) : null}

            <line x1={60} y1={30} x2={60} y2={270} stroke="rgba(182, 201, 221, 0.9)" strokeWidth="1" />
            <line x1={60} y1={270} x2={740} y2={270} stroke="rgba(182, 201, 221, 0.9)" strokeWidth="1" />
          </svg>
        </div>
      ) : (
        <div className="flex h-80 items-center justify-center rounded-sm border border-slate-200 bg-[#f7fbff]">
          <div className="text-center">
            <p className="text-base font-semibold text-[#0b2a5b]">Waiting for price data</p>
            <p className="mt-2 text-sm text-slate-500">Data will appear when the WebSocket connection is active.</p>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-xs uppercase tracking-[0.18em] text-slate-400">
        Real-time price updates. Last 60 points for {selectedSymbol}.
      </p>
    </div>
  );
}
