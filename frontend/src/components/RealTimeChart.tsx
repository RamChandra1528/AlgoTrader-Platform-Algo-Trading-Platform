'use client';

import React, { useState, useEffect } from 'react';
import { subscribeToPriceUpdates } from '@/lib/websocket';

interface PricePoint {
  time: string;
  AAPL: number | null;
  GOOGL: number | null;
  MSFT: number | null;
  TSLA: number | null;
}

export default function RealTimeChart() {
  const [data, setData] = useState<PricePoint[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<'AAPL' | 'GOOGL' | 'MSFT' | 'TSLA'>('AAPL');

  useEffect(() => {
    const unsubscribe = subscribeToPriceUpdates((price) => {
      setData((prevData) => {
        const timestamp = new Date().toLocaleTimeString();
        const lastPoint = prevData.length > 0 ? prevData[prevData.length - 1] : null;

        const newPoint: PricePoint = {
          time: timestamp,
          AAPL: price.symbol === 'AAPL' ? price.price : lastPoint?.AAPL || null,
          GOOGL: price.symbol === 'GOOGL' ? price.price : lastPoint?.GOOGL || null,
          MSFT: price.symbol === 'MSFT' ? price.price : lastPoint?.MSFT || null,
          TSLA: price.symbol === 'TSLA' ? price.price : lastPoint?.TSLA || null,
        };

        const updated = [...prevData, newPoint];
        return updated.slice(-60);
      });
    });

    return () => unsubscribe();
  }, []);

  // Get min and max for Y-axis scaling
  const selectedData = data.map(d => d[selectedSymbol]).filter(v => v !== null) as number[];
  const minPrice = selectedData.length > 0 ? Math.min(...selectedData) : 0;
  const maxPrice = selectedData.length > 0 ? Math.max(...selectedData) : 100;
  const range = maxPrice - minPrice || 1;
  const padding = range * 0.1;

  // SVG dimensions
  const svgWidth = 800;
  const svgHeight = 300;
  const padding_x = 60;
  const padding_y = 30;
  const chartWidth = svgWidth - padding_x * 2;
  const chartHeight = svgHeight - padding_y * 2;

  // Create path for the line
  const points = data.map((d, index) => {
    const x = padding_x + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const price = d[selectedSymbol];
    const y = price === null
      ? svgHeight - padding_y
      : padding_y + ((maxPrice + padding - price) / (range + padding * 2)) * chartHeight;
    return { x, y, price };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area fill path
  const areaPath = pathData
    ? `${pathData} L ${points[points.length - 1]?.x} ${svgHeight - padding_y} L ${points[0]?.x} ${svgHeight - padding_y} Z`
    : '';

  // Current price and change
  const currentPrice = selectedData.length > 0 ? selectedData[selectedData.length - 1] : 0;
  const previousPrice = selectedData.length > 1 ? selectedData[selectedData.length - 2] : currentPrice;
  const change = currentPrice - previousPrice;
  const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
  const isPositive = change >= 0;
  const lineColor = isPositive ? '#22c55e' : '#ef4444';
  const lineColorFaded = isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';

  return (
    <div className="w-full bg-gray-900 border border-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">{selectedSymbol}</h2>
          <p className="text-gray-400">
            <span className="text-white text-xl font-semibold">${currentPrice.toFixed(2)}</span>
            <span className={`ml-2 text-sm font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          {(['AAPL', 'GOOGL', 'MSFT', 'TSLA'] as const).map((symbol) => (
            <button
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                selectedSymbol === symbol
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      {data.length > 1 ? (
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full rounded-lg"
          style={{ background: 'rgba(17,24,39,0.5)' }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((i) => (
            <line
              key={`grid-${i}`}
              x1={padding_x}
              y1={padding_y + i * chartHeight}
              x2={svgWidth - padding_x}
              y2={padding_y + i * chartHeight}
              stroke="rgba(75,85,99,0.3)"
              strokeDasharray="5,5"
            />
          ))}

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((i) => {
            const price = maxPrice + padding - i * (range + padding * 2);
            return (
              <text
                key={`label-${i}`}
                x={padding_x - 10}
                y={padding_y + i * chartHeight + 5}
                textAnchor="end"
                fill="#9ca3af"
                fontSize="12"
              >
                ${price.toFixed(0)}
              </text>
            );
          })}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#areaGradient)" />}

          {/* Price line */}
          <path d={pathData} stroke={lineColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

          {/* Latest point glow */}
          {points.length > 0 && points[points.length - 1].price !== null && (
            <>
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="6"
                fill={lineColor}
                opacity="0.3"
              />
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="3"
                fill={lineColor}
              />
            </>
          )}

          {/* Axes */}
          <line x1={padding_x} y1={padding_y} x2={padding_x} y2={svgHeight - padding_y} stroke="rgba(75,85,99,0.5)" strokeWidth="1" />
          <line x1={padding_x} y1={svgHeight - padding_y} x2={svgWidth - padding_x} y2={svgHeight - padding_y} stroke="rgba(75,85,99,0.5)" strokeWidth="1" />
        </svg>
      ) : (
        <div className="flex items-center justify-center h-80 bg-gray-800/30 rounded-lg border border-gray-700">
          <div className="text-center">
            <div className="animate-pulse text-4xl mb-3">📈</div>
            <p className="text-gray-400">Waiting for price data...</p>
            <p className="text-gray-500 text-sm mt-1">Data will appear when WebSocket connects</p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3 text-center">Real-time price updates · Last 60 data points</p>
    </div>
  );
}
