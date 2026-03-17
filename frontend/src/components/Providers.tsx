"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AccountSnapshot,
  BotLogEvent,
  connectWebSocket,
  disconnectWebSocket,
  subscribeToAccountUpdates,
  subscribeToBotLogs,
} from "@/lib/websocket";

type TradingContextValue = {
  account: AccountSnapshot | null;
  setAccount: (snap: AccountSnapshot) => void;
  botLogs: Array<BotLogEvent & { ts: number }>;
  clearBotLogs: () => void;
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

  useEffect(() => {
    connectWebSocket();
    const unsub = subscribeToAccountUpdates((snap) => {
      setAccount(snap);
    });
    const unsubLogs = subscribeToBotLogs((e) => {
      setBotLogs((prev) => [{ ...e, ts: Date.now() }, ...prev].slice(0, 200));
    });
    return () => {
      unsub();
      unsubLogs();
      disconnectWebSocket();
    };
  }, []);

  const value = useMemo(
    () => ({
      account,
      setAccount,
      botLogs,
      clearBotLogs: () => setBotLogs([]),
    }),
    [account, botLogs]
  );

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
}

