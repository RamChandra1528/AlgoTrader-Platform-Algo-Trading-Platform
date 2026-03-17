export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
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
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  pnl: number;
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
