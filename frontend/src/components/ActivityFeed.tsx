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

      setActivities((prev) => [
        { ...notification, displayTime },
        ...prev.slice(0, 9),
      ]);
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
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Trading Activity</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 pulse-live" : "bg-red-500"}`} />
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-3xl mb-2 opacity-50">📢</div>
          <p className="text-gray-500 text-sm">No recent activity</p>
          <p className="text-gray-600 text-xs mt-1">Trade notifications will appear here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activities.map((activity, idx) => (
            <div
              key={`${activity.id}-${idx}`}
              className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-3 hover:border-gray-600/50 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-white text-sm">
                    <span className={activity.side === "BUY" || activity.side === "buy" ? "text-green-400" : "text-red-400"}>
                      {activity.side === "BUY" || activity.side === "buy" ? "↑" : "↓"}
                    </span>{" "}
                    {activity.symbol}
                  </p>
                  <p className="text-xs text-gray-400">
                    {activity.side.toUpperCase()} {activity.quantity} @ ${activity.price.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">{activity.displayTime}</p>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${
                    activity.status === "filled"
                      ? "text-green-400"
                      : activity.status === "pending"
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}>
                    {activity.status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
