"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AccountSnapshot,
  BotLogEvent,
  connectWebSocket,
  disconnectWebSocket,
  subscribeToAccountUpdates,
  subscribeToBotLogs,
  subscribeToTradeNotifications,
} from "@/lib/websocket";

type TradingContextValue = {
  account: AccountSnapshot | null;
  setAccount: (snap: AccountSnapshot) => void;
  botLogs: Array<BotLogEvent & { ts: number }>;
  clearBotLogs: () => void;
  tradeTape: Array<{
    id: number;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    status: string;
    timestamp: number;
  }>;
  equitySeries: Array<{ ts: number; equity: number }>;
  clearTradeTape: () => void;
};

const TradingContext = createContext<TradingContextValue | null>(null);

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be used within Providers");
  return ctx;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<AccountSnapshot | null>(null);
  const [botLogs, setBotLogs] = useState<Array<BotLogEvent & { ts: number }>>([]);
  const [tradeTape, setTradeTape] = useState<
    Array<{
      id: number;
      symbol: string;
      side: string;
      quantity: number;
      price: number;
      status: string;
      timestamp: number;
    }>
  >([]);
  const [equitySeries, setEquitySeries] = useState<Array<{ ts: number; equity: number }>>([]);

  useEffect(() => {
    connectWebSocket();
    const unsub = subscribeToAccountUpdates((snap) => {
      setAccount(snap);
      const ts = typeof snap.timestamp === "number" ? snap.timestamp : Date.now();
      if (typeof snap.equity === "number") {
        setEquitySeries((prev) => {
          const next = [...prev, { ts, equity: snap.equity }];
          return next.slice(-240); // keep last ~240 points
        });
      }
    });
    const unsubLogs = subscribeToBotLogs((e) => {
      setBotLogs((prev) => [{ ...e, ts: Date.now() }, ...prev].slice(0, 200));
    });
    const unsubTrades = subscribeToTradeNotifications((t: any) => {
      const ts = typeof t.timestamp === "number" ? t.timestamp : Date.now();
      setTradeTape((prev) => [{ ...t, timestamp: ts }, ...prev].slice(0, 50));
    });
    return () => {
      unsub();
      unsubLogs();
      unsubTrades();
      disconnectWebSocket();
    };
  }, []);

  const value = useMemo(
    () => ({
      account,
      setAccount,
      botLogs,
      clearBotLogs: () => setBotLogs([]),
      tradeTape,
      clearTradeTape: () => setTradeTape([]),
      equitySeries,
    }),
    [account, botLogs, tradeTape, equitySeries]
  );

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

