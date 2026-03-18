"use client";

import { useEffect, useState } from "react";
import {
  subscribeToTradeNotifications,
  subscribeToConnectionStatus,
} from "@/lib/websocket";

interface TradeNotification {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  status: string;
  timestamp: number;
}

interface ActivityLog extends TradeNotification {
  displayTime: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const unsubscribeTrades = subscribeToTradeNotifications((notification) => {
      const now = new Date(notification.timestamp);
      const displayTime = now.toLocaleTimeString();

      setActivities((prev) => [{ ...notification, displayTime }, ...prev.slice(0, 9)]);
    });

    const unsubscribeConnection = subscribeToConnectionStatus((connected) => {
      setIsConnected(connected);
    });

    return () => {
      unsubscribeTrades();
      unsubscribeConnection();
    };
  }, []);

  return (
    <div className="surface-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="app-kicker">Activity</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0b2a5b]">
            Trading activity
          </h2>
        </div>
        <div className="enterprise-chip">
          <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500 pulse-live" : "bg-red-500"}`} />
          {isConnected ? "Live" : "Offline"}
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-sm border border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <p className="text-base font-semibold text-[#0b2a5b]">No recent activity</p>
          <p className="mt-2 text-sm text-slate-500">Trade notifications will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, idx) => {
            const isBuy = activity.side === "BUY" || activity.side === "buy";
            const statusClass =
              activity.status === "filled"
                ? "status-positive"
                : activity.status === "pending"
                  ? "status-neutral"
                  : "status-negative";

            return (
              <div
                key={`${activity.id}-${idx}`}
                className="rounded-sm border border-slate-200 bg-slate-50 p-4 transition hover:border-[#9fd9f8]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#0b2a5b]">
                      <span className={isBuy ? "status-positive" : "status-negative"}>
                        {isBuy ? "BUY" : "SELL"}
                      </span>{" "}
                      {activity.symbol}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {activity.quantity} @ ${activity.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{activity.displayTime}</p>
                    <p className={`mt-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClass}`}>
                      {activity.status}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
