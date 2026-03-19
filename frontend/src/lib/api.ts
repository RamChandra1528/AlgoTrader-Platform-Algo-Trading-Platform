import axios from "axios";
import type { PlatformControlState } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authApi = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

// --- Dashboard ---
export const dashboardApi = {
  summary: () => api.get("/dashboard/summary"),
  equityCurve: () => api.get("/dashboard/equity-curve"),
  positions: () => api.get("/dashboard/positions"),
};

// --- Strategies ---
export const strategiesApi = {
  list: () => api.get("/strategies/"),
  create: (data: { name: string; strategy_type: string; parameters?: Record<string, number> }) =>
    api.post("/strategies/", data),
  get: (id: number) => api.get(`/strategies/${id}`),
  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/strategies/${id}`, data),
  delete: (id: number) => api.delete(`/strategies/${id}`),
};

// --- Backtests ---
export const backtestsApi = {
  run: (data: {
    strategy_id: number;
    symbol: string;
    start_date: string;
    end_date: string;
    initial_capital?: number;
  }) => api.post("/backtests/run", data),
  list: () => api.get("/backtests/"),
  get: (id: number) => api.get(`/backtests/${id}`),
};

// --- Trading ---
export const tradingApi = {
  execute: (data: { symbol: string; side: string; quantity: number; strategy_id?: number }) =>
    api.post("/trading/execute", data),
  portfolio: () => api.get("/trading/portfolio"),
  history: () => api.get("/trading/history"),
};

// --- Auto Trading ---
export const autoTradingApi = {
  scan: () => api.post("/autotrading/scan"),
  execute: (data: { budget: number }) => api.post("/autotrading/execute", data),
  liveStart: (data: {
    profit_target_pct?: number;
    stop_loss_pct?: number;
    budget_per_trade?: number;
    max_positions?: number;
    loop_interval_sec?: number;
  }) => api.post("/autotrading/live/start", data),
  liveStop: () => api.post("/autotrading/live/stop"),
  liveStatus: () => api.get("/autotrading/live/status"),
};

export const adminApi = {
  summary: () => api.get("/admin/summary"),
  listUsers: () => api.get("/admin/users"),
  updateUser: (id: number, data: Record<string, unknown>) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  resetUserBalance: (id: number, new_balance: number) =>
    api.post(`/admin/users/${id}/reset-balance`, { new_balance }),
  userPortfolio: (id: number) => api.get(`/admin/users/${id}/portfolio`),
  userTrades: (id: number, limit = 100) => api.get(`/admin/users/${id}/trades`, { params: { limit } }),
  setGlobalTrading: (enabled: boolean) => api.post("/admin/trading/global", { enabled }),
  pauseUserTrading: (id: number, enabled: boolean) =>
    api.post(`/admin/trading/users/${id}/pause`, { enabled }),
  forceClose: (user_id?: number) => api.post("/admin/trading/force-close", { user_id }),
  overrideSignal: (data: {
    user_id: number;
    symbol: string;
    side: string;
    quantity: number;
    strategy_id?: number;
    note?: string;
  }) => api.post("/admin/trading/override-signal", data),
  listStrategies: () => api.get("/admin/strategies"),
  updateStrategy: (id: number, data: { parameters: Record<string, unknown>; is_active?: boolean }) =>
    api.patch(`/admin/strategies/${id}`, data),
  risk: () => api.get<PlatformControlState>("/admin/risk"),
  updateRisk: (data: {
    global_stop_loss_limit: number;
    default_max_trade_amount: number;
    default_daily_loss_limit: number;
    default_max_trades_per_day: number;
  }) => api.put("/admin/risk", data),
  systemStatus: () => api.get("/admin/system/status"),
  setSystemRun: (enabled: boolean) => api.post("/admin/system/run", { enabled }),
  setMarketData: (enabled: boolean) => api.post("/admin/system/market-data", { enabled }),
  restartService: (service_name: string) => api.post(`/admin/system/restart/${service_name}`),
  auditLogs: (params?: { limit?: number; entity_type?: string }) => api.get("/admin/logs/audit", { params }),
};

export default api;
