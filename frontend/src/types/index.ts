export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "user";
  is_active: boolean;
  is_trading_enabled: boolean;
  created_at: string;
  starting_balance: number;
  cash_balance: number;
  max_trade_amount: number;
  daily_loss_limit: number;
  max_trades_per_day: number;
  last_login_at?: string | null;
}

export interface Strategy {
  id: number;
  user_id: number;
  name: string;
  strategy_type: "ma_crossover" | "rsi";
  parameters: Record<string, number>;
  is_active: boolean;
  created_at: string;
}

export interface Trade {
  id: number;
  user_id?: number;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  pnl: number;
  source?: string;
  notes?: string | null;
  executed_at: string;
}

export interface Position {
  id?: number;
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  unrealized_pnl: number;
  market_value?: number;
  updated_at?: string;
}

export interface BacktestResult {
  id: number;
  user_id: number;
  strategy_id: number;
  symbol: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  final_value: number;
  total_return: number;
  sharpe_ratio: number;
  max_drawdown: number;
  equity_curve: { date: string; value: number }[];
  trades_log: { date: string; side: string; price: number; size: number }[];
  created_at: string;
}

export interface DashboardSummary {
  total_pnl: number;
  total_trades: number;
  open_positions: number;
  portfolio_value: number;
  win_rate: number;
}

export interface EquityCurvePoint {
  date: string;
  value: number;
}

export interface ServiceStatus {
  service_name: string;
  status: string;
  message?: string | null;
  last_heartbeat?: string | null;
  last_restart_at?: string | null;
  updated_at?: string | null;
}

export interface AdminDashboardSummary {
  total_users: number;
  active_traders: number;
  total_trades_executed: number;
  platform_realized_pnl: number;
  platform_unrealized_pnl: number;
  platform_equity: number;
  system_status: string;
  trading_enabled: boolean;
  market_data_enabled: boolean;
  services: ServiceStatus[];
}

export interface AdminUserSummary extends User {
  total_trades: number;
  open_positions: number;
}

export interface PlatformControlState {
  system_running: boolean;
  trading_enabled: boolean;
  market_data_enabled: boolean;
  global_stop_loss_limit: number;
  default_max_trade_amount: number;
  default_daily_loss_limit: number;
  default_max_trades_per_day: number;
  updated_at: string;
}

export interface AuditLogRecord {
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
