// Real-time data service using WebSocket
let ws: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

const getWebSocketUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
  if (typeof window === "undefined") return `${baseUrl}/ws`;
  const token = localStorage.getItem("token");
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${baseUrl}/ws${qs}`;
};
interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  change: number;
  changePercent: number;
}

interface PositionUpdate {
  id: number;
  symbol: string;
  currentPrice: number;
  unrealizedPnL: number;
  timestamp: number;
}

interface TradeNotification {
  id: number;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  status: string;
  timestamp: number;
}

export interface BotLogEvent {
  level: "info" | "warning" | "error";
  event: string;
  message: string;
  symbol?: string;
}

export interface AdminMonitorEvent {
  category: string;
  action: string;
  message: string;
  timestamp: number;
  user_id?: number | null;
  symbol?: string | null;
  value?: number | null;
  meta: Record<string, unknown>;
}

export interface AuditLogEvent {
  id: number;
  actor_user_id?: number | null;
  target_user_id?: number | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  severity: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface SystemStatusEvent {
  system_running: boolean;
  trading_enabled: boolean;
  market_data_enabled: boolean;
  global_stop_loss_limit: number;
  default_max_trade_amount: number;
  default_daily_loss_limit: number;
  default_max_trades_per_day: number;
  services: Array<{
    service_name: string;
    status: string;
    message?: string | null;
    last_heartbeat?: string | null;
    last_restart_at?: string | null;
    updated_at?: string | null;
  }>;
  timestamp: number;
}

export interface AccountSnapshot {
  starting_balance: number;
  cash_balance: number;
  market_value: number;
  equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  positions: Array<{
    id: number;
    symbol: string;
    quantity: number;
    avg_price: number;
    current_price: number;
    unrealized_pnl: number;
    market_value: number;
    updated_at?: string | null;
  }>;
  last_trade?: {
    id: number;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    pnl: number;
    executed_at: string;
  };
  timestamp?: number;
}

type DataCallback<T> = (data: T) => void;

const callbacks = {
  priceUpdates: [] as DataCallback<PriceUpdate>[],
  positionUpdates: [] as DataCallback<PositionUpdate>[],
  tradeNotifications: [] as DataCallback<TradeNotification>[],
  accountUpdates: [] as DataCallback<AccountSnapshot>[],
  botLogs: [] as DataCallback<BotLogEvent>[],
  connectionStatus: [] as DataCallback<boolean>[],
  adminMonitor: [] as DataCallback<AdminMonitorEvent>[],
  auditLogs: [] as DataCallback<AuditLogEvent>[],
  systemStatus: [] as DataCallback<SystemStatusEvent>[],
};

export function connectWebSocket() {
  const wsUrl = getWebSocketUrl();

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      reconnectAttempts = 0;
      notifyConnectionStatus(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      notifyConnectionStatus(false);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      notifyConnectionStatus(false);
      attemptReconnect();
    };
  } catch (error) {
    console.error("Failed to connect WebSocket:", error);
    attemptReconnect();
  }
}

function handleMessage(message: any) {
  const { type, data } = message;

  switch (type) {
    case "connection":
      console.log("WebSocket connection confirmed");
      break;
    case "price_update":
      // Handle both single price and array of prices
      if (Array.isArray(data)) {
        data.forEach((price: PriceUpdate) => {
          callbacks.priceUpdates.forEach((cb) => cb(price));
        });
      } else {
        callbacks.priceUpdates.forEach((cb) => cb(data as PriceUpdate));
      }
      break;
    case "position_update":
      callbacks.positionUpdates.forEach((cb) => cb(data as PositionUpdate));
      break;
    case "trade_notification":
      callbacks.tradeNotifications.forEach((cb) => cb(data as TradeNotification));
      break;
    case "account_update":
      callbacks.accountUpdates.forEach((cb) => cb(data as AccountSnapshot));
      break;
    case "bot_log":
      callbacks.botLogs.forEach((cb) => cb(data as BotLogEvent));
      break;
    case "admin_monitor":
      callbacks.adminMonitor.forEach((cb) => cb(data as AdminMonitorEvent));
      break;
    case "audit_log":
      callbacks.auditLogs.forEach((cb) => cb(data as AuditLogEvent));
      break;
    case "system_status":
      callbacks.systemStatus.forEach((cb) => cb(data as SystemStatusEvent));
      break;
    default:
      // Silently ignore unknown types
      break;
  }
}

function attemptReconnect() {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(
      `Attempting to reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );
    setTimeout(() => connectWebSocket(), RECONNECT_DELAY);
  } else {
    console.error("Max reconnection attempts reached");
  }
}

function notifyConnectionStatus(connected: boolean) {
  callbacks.connectionStatus.forEach((cb) => cb(connected));
}

export function subscribeToPriceUpdates(
  callback: DataCallback<PriceUpdate>
) {
  callbacks.priceUpdates.push(callback);
  return () => {
    callbacks.priceUpdates = callbacks.priceUpdates.filter((cb) => cb !== callback);
  };
}

export function subscribeToPositionUpdates(
  callback: DataCallback<PositionUpdate>
) {
  callbacks.positionUpdates.push(callback);
  return () => {
    callbacks.positionUpdates = callbacks.positionUpdates.filter(
      (cb) => cb !== callback
    );
  };
}

export function subscribeToTradeNotifications(
  callback: DataCallback<TradeNotification>
) {
  callbacks.tradeNotifications.push(callback);
  return () => {
    callbacks.tradeNotifications = callbacks.tradeNotifications.filter(
      (cb) => cb !== callback
    );
  };
}

export function subscribeToAccountUpdates(
  callback: DataCallback<AccountSnapshot>
) {
  callbacks.accountUpdates.push(callback);
  return () => {
    callbacks.accountUpdates = callbacks.accountUpdates.filter((cb) => cb !== callback);
  };
}

export function subscribeToBotLogs(callback: DataCallback<BotLogEvent>) {
  callbacks.botLogs.push(callback);
  return () => {
    callbacks.botLogs = callbacks.botLogs.filter((cb) => cb !== callback);
  };
}

export function subscribeToConnectionStatus(
  callback: DataCallback<boolean>
) {
  callbacks.connectionStatus.push(callback);
  return () => {
    callbacks.connectionStatus = callbacks.connectionStatus.filter(
      (cb) => cb !== callback
    );
  };
}

export function subscribeToAdminMonitor(callback: DataCallback<AdminMonitorEvent>) {
  callbacks.adminMonitor.push(callback);
  return () => {
    callbacks.adminMonitor = callbacks.adminMonitor.filter((cb) => cb !== callback);
  };
}

export function subscribeToAuditLogs(callback: DataCallback<AuditLogEvent>) {
  callbacks.auditLogs.push(callback);
  return () => {
    callbacks.auditLogs = callbacks.auditLogs.filter((cb) => cb !== callback);
  };
}

export function subscribeToSystemStatus(callback: DataCallback<SystemStatusEvent>) {
  callbacks.systemStatus.push(callback);
  return () => {
    callbacks.systemStatus = callbacks.systemStatus.filter((cb) => cb !== callback);
  };
}

export function disconnectWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function isWebSocketConnected(): boolean {
  return ws ? ws.readyState === WebSocket.OPEN : false;
}

export function sendWebSocketMessage(message: any) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
